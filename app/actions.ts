"use server"

import clientPromise from "@/lib/mongodb"

// Change from union type to string type for flexibility
type Person = string

type BeerCountsResponse = {
  personCounts: Record<Person, number>
  dailyPersonCounts: Record<Person, number>
  lastAction: Person | null
  canUndo: boolean
  allUsers: Person[]
  today: string
}

interface DrinkPhoto {
  _id: string
  person: string
  imageData: string
  timestamp: string
}

// Helper function to get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

// Get current beer counts from the database
export async function getBeerCounts(): Promise<BeerCountsResponse> {
  try {
    const client = await clientPromise
    const db = client.db("beer-counter")
    const today = getTodayDate()

    // Get all users from the users collection
    const users = await db.collection("users").find({}).toArray()

    // If no users exist, create the default set
    if (users.length === 0) {
      const defaultUsers = ["aaron", "nick", "aj", "isaac", "sam"]
      await Promise.all(defaultUsers.map((user) => db.collection("users").insertOne({ name: user })))
      // Refetch users after creating defaults
      users.splice(0, users.length, ...(await db.collection("users").find({}).toArray()))
    }

    // Extract user names from the users collection
    const allUsers = users.map((user) => user.name)

    // Get people counts (all-time)
    const peopleCounter = await db.collection("counters").find({}).toArray()

    // Get daily counters
    let dailyCounters = await db.collection("dailyCounters").find({ date: today }).toArray()

    // Check if we need to reset daily counts
    const lastDateRecord = await db.collection("lastDate").findOne({ id: "lastDate" })
    if (!lastDateRecord || lastDateRecord.date !== today) {
      // New day - reset daily counters
      await db.collection("dailyCounters").deleteMany({ date: { $ne: today } })
      await db.collection("lastDate").updateOne({ id: "lastDate" }, { $set: { date: today } }, { upsert: true })
      // Clear dailyCounters as we've deleted old entries
      dailyCounters = []

      // Delete previous day's photos
      await db.collection("drinkPhotos").deleteMany({ date: { $ne: today } })
    }

    // Create maps of person to count with all users initialized to 0
    const personCounts: Record<Person, number> = {}
    const dailyPersonCounts: Record<Person, number> = {}

    allUsers.forEach((user) => {
      personCounts[user] = 0
      dailyPersonCounts[user] = 0
    })

    // Fill in actual all-time counts from DB
    peopleCounter.forEach((person) => {
      if (person.name in personCounts) {
        personCounts[person.name] = person.count || 0
      }
    })

    // Fill in actual daily counts from DB
    dailyCounters.forEach((daily) => {
      if (daily.name in dailyPersonCounts) {
        dailyPersonCounts[daily.name] = daily.count || 0
      }
    })

    // Get last action
    const lastAction = await db.collection("lastAction").findOne({ id: "last" })

    return {
      personCounts,
      dailyPersonCounts,
      lastAction: lastAction?.person || null,
      canUndo: !!lastAction?.canUndo,
      allUsers,
      today,
    }
  } catch (error) {
    console.error("Error getting beer counts:", error)
    throw new Error("Failed to get beer counts")
  }
}

// Increment beer count for a person and store drink photo
export async function incrementBeer(person: Person, imageData: string): Promise<BeerCountsResponse> {
  try {
    const client = await clientPromise
    const db = client.db("beer-counter")
    const today = getTodayDate()
    const timestamp = new Date().toISOString()

    // Update the person's all-time count using upsert
    await db.collection("counters").updateOne({ name: person }, { $inc: { count: 1 } }, { upsert: true })

    // Update the person's daily count using upsert
    await db
      .collection("dailyCounters")
      .updateOne({ name: person, date: today }, { $inc: { count: 1 } }, { upsert: true })

    // Store the drink photo
    await db.collection("drinkPhotos").insertOne({
      person,
      imageData,
      date: today,
      timestamp,
    })

    // Update last action
    await db
      .collection("lastAction")
      .updateOne({ id: "last" }, { $set: { person, canUndo: true, daily: true } }, { upsert: true })

    // Return updated counts
    return await getBeerCounts()
  } catch (error) {
    console.error(`Error incrementing beer for ${person}:`, error)
    throw new Error(`Failed to increment beer for ${person}`)
  }
}

// Get drink photos for today
export async function getDrinkPhotos(): Promise<DrinkPhoto[]> {
  try {
    const client = await clientPromise
    const db = client.db("beer-counter")
    const today = getTodayDate()

    // Get today's photos
    const photos = await db
      .collection("drinkPhotos")
      .find({ date: today })
      .sort({ timestamp: -1 }) // Most recent first
      .toArray()

    return photos as DrinkPhoto[]
  } catch (error) {
    console.error("Error getting drink photos:", error)
    throw new Error("Failed to get drink photos")
  }
}

// Add a new user to the system
export async function addUser(name: string): Promise<BeerCountsResponse> {
  try {
    const client = await clientPromise
    const db = client.db("beer-counter")

    // Check if user already exists
    const existingUser = await db.collection("users").findOne({ name })
    if (existingUser) {
      throw new Error(`User ${name} already exists`)
    }

    // Add new user
    await db.collection("users").insertOne({ name })

    // Return updated counts and user list
    return await getBeerCounts()
  } catch (error) {
    console.error(`Error adding user ${name}:`, error)
    throw new Error(`Failed to add user ${name}`)
  }
}

// Remove a user from the system
export async function removeUser(name: string): Promise<BeerCountsResponse> {
  try {
    const client = await clientPromise
    const db = client.db("beer-counter")

    // Remove user from users collection
    await db.collection("users").deleteOne({ name })

    // Remove user's counters
    await db.collection("counters").deleteOne({ name })
    await db.collection("dailyCounters").deleteMany({ name })

    // Return updated counts and user list
    return await getBeerCounts()
  } catch (error) {
    console.error(`Error removing user ${name}:`, error)
    throw new Error(`Failed to remove user ${name}`)
  }
}

// Undo last action
export async function undoLastAction(): Promise<BeerCountsResponse> {
  try {
    const client = await clientPromise
    const db = client.db("beer-counter")
    const today = getTodayDate()

    // Get the last action
    const lastAction = await db.collection("lastAction").findOne({ id: "last" })

    if (!lastAction || !lastAction.canUndo) {
      throw new Error("No action to undo")
    }

    // Decrement the all-time count for the last person
    await db.collection("counters").updateOne({ name: lastAction.person }, { $inc: { count: -1 } })

    // If action was from today, also decrement the daily count
    if (lastAction.daily) {
      await db.collection("dailyCounters").updateOne({ name: lastAction.person, date: today }, { $inc: { count: -1 } })

      // Remove the most recent photo for this person
      const mostRecentPhoto = await db
        .collection("drinkPhotos")
        .findOne({ person: lastAction.person, date: today }, { sort: { timestamp: -1 } })

      if (mostRecentPhoto) {
        await db.collection("drinkPhotos").deleteOne({ _id: mostRecentPhoto._id })
      }
    }

    // Update last action to prevent multiple undos
    await db.collection("lastAction").updateOne({ id: "last" }, { $set: { canUndo: false } })

    // Return updated counts
    return await getBeerCounts()
  } catch (error) {
    console.error("Error undoing last action:", error)
    throw new Error("Failed to undo last action")
  }
}

// Reset all counts
export async function resetAllCounts(): Promise<BeerCountsResponse> {
  try {
    const client = await clientPromise
    const db = client.db("beer-counter")
    const today = getTodayDate()

    // Get all users first
    const users = await db.collection("users").find({}).toArray()
    const userNames = users.map((user) => user.name)

    // Reset counts for all users
    await db.collection("counters").updateMany({ name: { $in: userNames } }, { $set: { count: 0 } })

    // Reset daily counts
    await db.collection("dailyCounters").deleteMany({ date: today })

    // Delete all photos for today
    await db.collection("drinkPhotos").deleteMany({ date: today })

    // Reset last action
    await db
      .collection("lastAction")
      .updateOne({ id: "last" }, { $set: { person: null, canUndo: false } }, { upsert: true })

    // Return updated counts
    return await getBeerCounts()
  } catch (error) {
    console.error("Error resetting counts:", error)
    throw new Error("Failed to reset counts")
  }
}

// Reset only daily counts
export async function resetDailyCounts(): Promise<BeerCountsResponse> {
  try {
    const client = await clientPromise
    const db = client.db("beer-counter")
    const today = getTodayDate()

    // Reset daily counts for today
    await db.collection("dailyCounters").deleteMany({ date: today })

    // Delete all photos for today
    await db.collection("drinkPhotos").deleteMany({ date: today })

    // Return updated counts
    return await getBeerCounts()
  } catch (error) {
    console.error("Error resetting daily counts:", error)
    throw new Error("Failed to reset daily counts")
  }
}

