"use server"

import clientPromise from "@/lib/mongodb"

type Person = "aaron" | "nick"
type BeerCountsResponse = {
  aaronCount: number
  nickCount: number
  lastAction: Person | null
  canUndo: boolean
}

// Get current beer counts from the database
export async function getBeerCounts(): Promise<BeerCountsResponse> {
  try {
    const client = await clientPromise
    const db = client.db("beer-counter")

    // Get Aaron's count
    const aaron = await db.collection("counters").findOne({ name: "aaron" })

    // Get Nick's count
    const nick = await db.collection("counters").findOne({ name: "nick" })

    // Get last action
    const lastAction = await db.collection("lastAction").findOne({ id: "last" })

    return {
      aaronCount: aaron?.count || 0,
      nickCount: nick?.count || 0,
      lastAction: (lastAction?.person as Person) || null,
      canUndo: !!lastAction?.canUndo,
    }
  } catch (error) {
    console.error("Error getting beer counts:", error)
    throw new Error("Failed to get beer counts")
  }
}

// Increment beer count for a person
export async function incrementBeer(person: Person): Promise<BeerCountsResponse> {
  try {
    const client = await clientPromise
    const db = client.db("beer-counter")

    // Update the person's count using upsert
    await db.collection("counters").updateOne({ name: person }, { $inc: { count: 1 } }, { upsert: true })

    // Update last action
    await db.collection("lastAction").updateOne({ id: "last" }, { $set: { person, canUndo: true } }, { upsert: true })

    // Return updated counts
    return await getBeerCounts()
  } catch (error) {
    console.error(`Error incrementing beer for ${person}:`, error)
    throw new Error(`Failed to increment beer for ${person}`)
  }
}

// Undo last action
export async function undoLastAction(): Promise<BeerCountsResponse> {
  try {
    const client = await clientPromise
    const db = client.db("beer-counter")

    // Get the last action
    const lastAction = await db.collection("lastAction").findOne({ id: "last" })

    if (!lastAction || !lastAction.canUndo) {
      throw new Error("No action to undo")
    }

    // Decrement the count for the last person
    await db.collection("counters").updateOne({ name: lastAction.person }, { $inc: { count: -1 } })

    // Update last action to prevent multiple undos
    await db.collection("lastAction").updateOne({ id: "last" }, { $set: { canUndo: false } })

    // Return updated counts
    return await getBeerCounts()
  } catch (error) {
    console.error("Error undoing last action:", error)
    throw new Error("Failed to undo last action")
  }
}

// Reset all counts (optional admin function)
export async function resetAllCounts(): Promise<BeerCountsResponse> {
  try {
    const client = await clientPromise
    const db = client.db("beer-counter")

    // Reset Aaron's count
    await db.collection("counters").updateOne({ name: "aaron" }, { $set: { count: 0 } }, { upsert: true })

    // Reset Nick's count
    await db.collection("counters").updateOne({ name: "nick" }, { $set: { count: 0 } }, { upsert: true })

    // Reset last action
    await db
      .collection("lastAction")
      .updateOne({ id: "last" }, { $set: { person: null, canUndo: false } }, { upsert: true })

    return {
      aaronCount: 0,
      nickCount: 0,
      lastAction: null,
      canUndo: false,
    }
  } catch (error) {
    console.error("Error resetting counts:", error)
    throw new Error("Failed to reset counts")
  }
}

