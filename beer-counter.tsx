"use client"

import React from "react"

import { useState, useEffect } from "react"
import {
  Beer,
  Undo2,
  RefreshCw,
  UserPlus,
  UserMinus,
  RotateCcw,
  ShieldCheck,
  CalendarClock,
  Camera,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  getBeerCounts,
  incrementBeer,
  undoLastAction,
  resetAllCounts,
  addUser,
  removeUser,
  resetDailyCounts,
} from "@/app/actions"
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CameraCapture } from "@/components/camera-capture"
import { DrinkCarousel } from "@/components/drink-carousel"

export default function BeerCounter() {
  const [personCounts, setPersonCounts] = useState<Record<string, number>>({})
  const [dailyPersonCounts, setDailyPersonCounts] = useState<Record<string, number>>({})
  const [allUsers, setAllUsers] = useState<string[]>([])
  const [lastAction, setLastAction] = useState<string | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [animations, setAnimations] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [newUserName, setNewUserName] = useState("")
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [emojiTapCount, setEmojiTapCount] = useState(0)
  const [lastTapTime, setLastTapTime] = useState(0)
  const [today, setToday] = useState("")
  const [activeTab, setActiveTab] = useState("daily") // Default to daily view
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null)
  const [shouldRefreshCarousel, setShouldRefreshCarousel] = useState(0)
  const { toast } = useToast()

  const totalCount = Object.values(personCounts).reduce((sum, count) => sum + count, 0)
  const dailyTotalCount = Object.values(dailyPersonCounts).reduce((sum, count) => sum + count, 0)

  // Find the leader(s) for either daily or all-time counts
  const getLeaders = (counts: Record<string, number>) => {
    if (!allUsers.length) return { leaders: [], maxCount: 0 }

    const maxCount = Math.max(...Object.values(counts))
    const leaders = allUsers.filter((user) => counts[user] === maxCount && maxCount > 0)
    return { leaders, maxCount }
  }

  const { leaders: allTimeLeaders, maxCount: allTimeMaxCount } = getLeaders(personCounts)
  const { leaders: dailyLeaders, maxCount: dailyMaxCount } = getLeaders(dailyPersonCounts)

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    const [year, month, day] = dateStr.split("-").map(Number)
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  // Check for admin mode activation
  const handleEmojiTap = () => {
    const currentTime = new Date().getTime()

    // Reset count if it's been more than 1.5 seconds since last tap
    if (currentTime - lastTapTime > 1500) {
      setEmojiTapCount(1)
    } else {
      setEmojiTapCount((prev) => prev + 1)
    }

    setLastTapTime(currentTime)

    // Check if we should enter admin mode
    if (emojiTapCount + 1 === 5) {
      setIsAdminMode((prev) => {
        const newMode = !prev
        toast({
          title: newMode ? "Admin Mode Activated" : "Admin Mode Deactivated",
          description: newMode
            ? "Administrative functions are now available."
            : "Administrative functions are now hidden.",
        })
        return newMode
      })
      setEmojiTapCount(0)
    }
  }

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getBeerCounts()
        setPersonCounts(data.personCounts)
        setDailyPersonCounts(data.dailyPersonCounts)
        setAllUsers(data.allUsers)
        setLastAction(data.lastAction)
        setCanUndo(data.canUndo)
        setToday(data.today)
      } catch (error) {
        toast({
          title: "Error loading data",
          description: "Could not load beer counts from the database.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [toast])

  const handleBeerIncrement = async (person: string) => {
    // Open camera to take a photo first
    setSelectedPerson(person)
    setIsCameraOpen(true)

    // Set a timeout to handle cases where camera might not initialize
    setTimeout(() => {
      if (isCameraOpen && selectedPerson === person) {
        // If camera is still open after 5 seconds, show a fallback option
        toast({
          title: "Camera not working?",
          description: (
            <div className="flex flex-col gap-2">
              <p>If your camera isn't working, you can continue without a photo.</p>
              <Button
                variant="outline"
                onClick={() => {
                  // Use a placeholder image instead
                  const placeholderImage =
                    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNGNUNDNjIiLz48cGF0aCBkPSJNODAgNjBDODAgNTcuNzkxIDgxLjc5MSA1NiA4NCA1Nkg5NkMxMDIuNjI3IDU2IDEwOCA2MS4zNzMgMTA4IDY4VjEzNkMxMDggMTQyLjYyNyAxMDIuNjI3IDE0OCA5NiAxNDhIODRDODEuNzkxIDE0OCA4MCAxNDYuMjA5IDgwIDE0NFYxMzZDODAgMTMzLjc5MSA4MS43OTEgMTMyIDg0IDEzMkg5NlY2OEg4NFY2MFoiIGZpbGw9IiNGRkZGRkYiLz48cGF0aCBkPSJNMTIwIDY4QzEyMCA2MS4zNzMgMTI1LjM3MyA1NiAxMzIgNTZIMTQ0QzE0Ni4yMDkgNTYgMTQ4IDU3Ljc5MSAxNDggNjBWNjhDMTQ4IDcwLjIwOSAxNDYuMjA5IDcyIDE0NCA3MkgxMzJWOTZIMTQ0QzE0Ni4yMDkgOTYgMTQ4IDk3Ljc5MSAxNDggMTAwVjEwOEMxNDggMTEwLjIwOSAxNDYuMjA5IDExMiAxNDQgMTEySDEzMlYxMzZIMTQ0QzE0Ni4yMDkgMTM2IDE0OCAxMzcuNzkxIDE0OCAxNDBWMTQ4QzE0OCAxNTAuMjA5IDE0Ni4yMDkgMTUyIDE0NCAxNTJIMTMyQzEyNS4zNzMgMTUyIDEyMCAxNDYuNjI3IDEyMCAxNDBWNjhaIiBmaWxsPSIjRkZGRkZGIi8+PHBhdGggZD0iTTUyIDEwMEM1MiA5Ny43OTEgNTMuNzkxIDk2IDU2IDk2SDY4QzcwLjIwOSA5NiA3MiA5Ny43OTEgNzIgMTAwVjE0NEM3MiAxNDYuMjA5IDcwLjIwOSAxNDggNjggMTQ4SDU2QzUzLjc5MSAxNDggNTIgMTQ2LjIwOSA1MiAxNDRWMTAwWiIgZmlsbD0iI0ZGRkZGRiIvPjxwYXRoIGQ9Ik01MiA2MEM1MiA1Ny43OTEgNTMuNzkxIDU2IDU2IDU2SDY4QzcwLjIwOSA1NiA3MiA1Ny43OTEgNzIgNjBWNzJDNzIgNzQuMjA5IDcwLjIwOSA3NiA2OCA3Nkg1NkM1My43OTEgNzYgNTIgNzQuMjA5IDUyIDcyVjYwWiIgZmlsbD0iI0ZGRkZGRiIvPjwvc3ZnPg=="
                  handlePhotoCapture(placeholderImage)
                  setIsCameraOpen(false)
                }}
              >
                Continue without photo
              </Button>
            </div>
          ),
          duration: 10000,
        })
      }
    }, 5000)
  }

  const handlePhotoCapture = async (imageData: string) => {
    if (!selectedPerson) return

    setIsUpdating(true)
    // Set animation for this person
    setAnimations((prev) => ({ ...prev, [selectedPerson]: true }))

    try {
      const result = await incrementBeer(selectedPerson, imageData)
      setPersonCounts(result.personCounts)
      setDailyPersonCounts(result.dailyPersonCounts)
      setAllUsers(result.allUsers)
      setLastAction(result.lastAction)
      setCanUndo(result.canUndo)
      setToday(result.today)

      // Trigger carousel refresh
      setShouldRefreshCarousel((prev) => prev + 1)

      toast({
        title: "Cheers! 🍻",
        description: `Added a beer for ${selectedPerson} with photo.`,
      })
    } catch (error) {
      toast({
        title: "Error updating count",
        description: `Could not update ${selectedPerson}'s beer count.`,
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
      setSelectedPerson(null)

      // Clear animation after delay
      setTimeout(() => {
        setAnimations((prev) => ({ ...prev, [selectedPerson as string]: false }))
      }, 1000)
    }
  }

  const handleCameraClose = () => {
    setIsCameraOpen(false)
    setSelectedPerson(null)
  }

  const handleUndo = async () => {
    if (!canUndo) return

    setIsUpdating(true)
    try {
      const result = await undoLastAction()
      setPersonCounts(result.personCounts)
      setDailyPersonCounts(result.dailyPersonCounts)
      setAllUsers(result.allUsers)
      setLastAction(result.lastAction)
      setCanUndo(result.canUndo)
      setToday(result.today)

      // Trigger carousel refresh
      setShouldRefreshCarousel((prev) => prev + 1)

      toast({
        title: "Undo successful",
        description: `Undid beer for ${lastAction}.`,
      })
    } catch (error) {
      toast({
        title: "Error undoing action",
        description: "Could not undo the last action.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUserName.trim()) return

    setIsUpdating(true)
    try {
      const result = await addUser(newUserName.trim().toLowerCase())
      setPersonCounts(result.personCounts)
      setDailyPersonCounts(result.dailyPersonCounts)
      setAllUsers(result.allUsers)
      setLastAction(result.lastAction)
      setCanUndo(result.canUndo)
      setNewUserName("")

      toast({
        title: "User added",
        description: `${newUserName} has been added to the beer counter.`,
      })
    } catch (error) {
      toast({
        title: "Error adding user",
        description: "This user might already exist or there was a server error.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemoveUser = async (person: string) => {
    if (!confirm(`Are you sure you want to remove ${person}?`)) return

    setIsUpdating(true)
    try {
      const result = await removeUser(person)
      setPersonCounts(result.personCounts)
      setDailyPersonCounts(result.dailyPersonCounts)
      setAllUsers(result.allUsers)
      setLastAction(result.lastAction)
      setCanUndo(result.canUndo)
      setToday(result.today)

      toast({
        title: "User removed",
        description: `${person} has been removed from the beer counter.`,
      })
    } catch (error) {
      toast({
        title: "Error removing user",
        description: `Could not remove ${person}.`,
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleResetAllCounts = async () => {
    if (!confirm("Are you sure you want to reset all beer counts?")) return

    setIsUpdating(true)
    try {
      const result = await resetAllCounts()
      setPersonCounts(result.personCounts)
      setDailyPersonCounts(result.dailyPersonCounts)
      setAllUsers(result.allUsers)
      setLastAction(result.lastAction)
      setCanUndo(result.canUndo)
      setToday(result.today)

      // Trigger carousel refresh
      setShouldRefreshCarousel((prev) => prev + 1)

      toast({
        title: "Reset successful",
        description: "All beer counts have been reset to zero.",
      })
    } catch (error) {
      toast({
        title: "Error resetting counts",
        description: "Could not reset the beer counts.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleResetDailyCounts = async () => {
    if (!confirm("Are you sure you want to reset today's beer counts?")) return

    setIsUpdating(true)
    try {
      const result = await resetDailyCounts()
      setPersonCounts(result.personCounts)
      setDailyPersonCounts(result.dailyPersonCounts)
      setAllUsers(result.allUsers)
      setLastAction(result.lastAction)
      setCanUndo(result.canUndo)
      setToday(result.today)

      // Trigger carousel refresh
      setShouldRefreshCarousel((prev) => prev + 1)

      toast({
        title: "Reset successful",
        description: "Today's beer counts have been reset to zero.",
      })
    } catch (error) {
      toast({
        title: "Error resetting daily counts",
        description: "Could not reset today's beer counts.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const refreshData = async () => {
    setIsLoading(true)
    try {
      const data = await getBeerCounts()
      setPersonCounts(data.personCounts)
      setDailyPersonCounts(data.dailyPersonCounts)
      setAllUsers(data.allUsers)
      setLastAction(data.lastAction)
      setCanUndo(data.canUndo)
      setToday(data.today)

      // Trigger carousel refresh
      setShouldRefreshCarousel((prev) => prev + 1)

      toast({
        title: "Data refreshed",
        description: "The latest beer counts have been loaded.",
      })
    } catch (error) {
      toast({
        title: "Error refreshing data",
        description: "Could not refresh beer counts from the database.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-md bg-gradient-to-b from-amber-50 to-amber-100 min-h-screen rounded-xl shadow-inner flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-amber-600 mx-auto mb-4" />
          <p className="text-amber-800 text-xl font-bold">Loading beer counts...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="container mx-auto p-4 max-w-md bg-gradient-to-b from-amber-50 to-amber-100 min-h-screen rounded-xl shadow-inner">
        <div className="flex justify-between items-center mb-6 mt-4">
          <motion.h1
            className="text-4xl font-bold text-center text-amber-800 flex-1"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
          >
            <span onClick={handleEmojiTap} className="cursor-pointer">
              🍻
            </span>
            Beer Counter 🍻
          </motion.h1>
          <div className="flex gap-2">
            {isAdminMode && <ShieldCheck className="h-5 w-5 text-amber-700 animate-pulse" />}
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshData}
              disabled={isUpdating}
              className="text-amber-700 hover:text-amber-900 hover:bg-amber-200"
            >
              <RefreshCw className={`h-5 w-5 ${isUpdating ? "animate-spin" : ""}`} />
              <span className="sr-only">Refresh data</span>
            </Button>
          </div>
        </div>

        {/* Drink Photos Carousel */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-amber-800 mb-2">Today's Drinks</h2>
          <DrinkCarousel key={shouldRefreshCarousel} />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {allUsers.map((person) => (
            <div key={person} className="relative">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  className="h-28 w-full bg-gradient-to-br from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 rounded-xl shadow-lg flex flex-col items-center justify-center border-4 border-amber-300 relative"
                  onClick={() => handleBeerIncrement(person)}
                  disabled={isUpdating}
                >
                  <Beer className="h-8 w-8 mb-1 text-amber-100" />
                  <span className="text-lg font-bold text-amber-100 capitalize">{person}</span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs font-medium bg-amber-100/20 px-2 py-0.5 rounded-full text-amber-50">
                      Today: {dailyPersonCounts[person] || 0}
                    </span>
                    <span className="text-xl font-bold text-amber-100">{personCounts[person] || 0}</span>
                  </div>
                  {isAdminMode && (
                    <button
                      className="absolute top-1 right-1 p-1 bg-amber-100/20 rounded-full hover:bg-amber-100/40"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveUser(person)
                      }}
                    >
                      <UserMinus className="h-4 w-4 text-amber-100" />
                    </button>
                  )}
                  <div className="absolute bottom-1 right-1 p-1 bg-amber-100/20 rounded-full">
                    <Camera className="h-4 w-4 text-amber-100" />
                  </div>
                </Button>
              </motion.div>

              <AnimatePresence>
                {animations[person] && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1.5 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="text-6xl">🍺</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {isAdminMode && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-white/80 border-2 border-amber-400 text-amber-800 font-bold py-3 rounded-xl shadow-md flex items-center justify-center gap-2"
                >
                  <UserPlus className="h-5 w-5" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-amber-50 border-2 border-amber-300">
                <DialogHeader>
                  <DialogTitle className="text-amber-800">Add New Beer Drinker</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter name"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="border-amber-300"
                    />
                    <Button
                      type="submit"
                      className="bg-amber-600 hover:bg-amber-700"
                      disabled={!newUserName.trim() || isUpdating}
                    >
                      Add
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <div className="grid grid-rows-2 gap-2">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  className="w-full bg-white/80 border-2 border-orange-400 text-orange-800 font-bold py-1 rounded-xl shadow-md flex items-center justify-center gap-2"
                  onClick={handleResetDailyCounts}
                  disabled={isUpdating || dailyTotalCount === 0}
                >
                  <CalendarClock className="h-4 w-4" />
                  Reset Today
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  className="w-full bg-white/80 border-2 border-red-400 text-red-800 font-bold py-1 rounded-xl shadow-md flex items-center justify-center gap-2"
                  onClick={handleResetAllCounts}
                  disabled={isUpdating || totalCount === 0}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset All
                </Button>
              </motion.div>
            </div>
          </div>
        )}

        <motion.div whileHover={{ scale: canUndo ? 1.05 : 1 }}>
          <Button
            variant="outline"
            className="w-full mb-6 mt-2 bg-white/80 border-2 border-amber-400 text-amber-800 font-bold py-3 rounded-xl shadow-md flex items-center justify-center gap-2"
            disabled={!canUndo || isUpdating}
            onClick={handleUndo}
          >
            <Undo2 className="h-5 w-5" />
            Undo Last Beer {lastAction && `(${lastAction})`}
          </Button>
        </motion.div>

        {/* Daily & All-time counts summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <Card className="border-2 border-amber-300 bg-white/80 rounded-xl shadow-lg overflow-hidden">
              <CardHeader className="bg-amber-500 text-white py-3">
                <CardTitle className="text-center text-lg">Today's Tally</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <motion.div
                  className="text-3xl font-bold text-center text-amber-800"
                  key={dailyTotalCount}
                  initial={{ scale: 1.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {dailyTotalCount}
                </motion.div>
                <div className="text-center text-amber-600 mt-1 text-xs font-medium">{formatDate(today)}</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            <Card className="border-2 border-amber-300 bg-white/80 rounded-xl shadow-lg overflow-hidden">
              <CardHeader className="bg-amber-600 text-white py-3">
                <CardTitle className="text-center text-lg">All-Time Tally</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <motion.div
                  className="text-3xl font-bold text-center text-amber-800"
                  key={totalCount}
                  initial={{ scale: 1.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {totalCount}
                </motion.div>
                <div className="text-center text-amber-600 mt-1 text-xs font-medium">Total Beers</div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Leaderboard with tabs for daily/all-time */}
        <Tabs defaultValue="daily" className="mb-6">
          <TabsList className="w-full mb-4 bg-amber-100">
            <TabsTrigger
              value="daily"
              className="flex-1 data-[state=active]:bg-amber-500 data-[state=active]:text-white"
            >
              Today's Leaders
            </TabsTrigger>
            <TabsTrigger
              value="alltime"
              className="flex-1 data-[state=active]:bg-amber-600 data-[state=active]:text-white"
            >
              All-Time Leaders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              <Card className="border-2 border-amber-300 bg-white/80 rounded-xl shadow-lg overflow-hidden">
                <CardHeader className="bg-amber-500 text-white">
                  <CardTitle className="text-center text-2xl">Today's Leaderboard</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {allUsers.map((person) => (
                      <div key={person}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-lg text-amber-800 capitalize">{person}</span>
                          <motion.span
                            className="font-bold text-2xl text-amber-800"
                            key={`daily-${dailyPersonCounts[person] || 0}`}
                            initial={{ scale: 1.5 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring" }}
                          >
                            {dailyPersonCounts[person] || 0}
                          </motion.span>
                        </div>
                        <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.5 }}>
                          <Progress
                            value={dailyTotalCount ? ((dailyPersonCounts[person] || 0) / dailyTotalCount) * 100 : 0}
                            className="h-4 bg-amber-100"
                            indicatorClassName="bg-gradient-to-r from-amber-400 to-amber-500"
                          />
                        </motion.div>
                      </div>
                    ))}

                    {dailyTotalCount > 0 && (
                      <motion.div
                        className="mt-6 text-center font-bold text-xl bg-amber-100 p-3 rounded-lg border-2 border-amber-300"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        {dailyLeaders.length === 0 ? (
                          "No beers yet today!"
                        ) : dailyLeaders.length === 1 ? (
                          <span className="capitalize">
                            {dailyLeaders[0]} is winning today! 🏆 ({dailyMaxCount})
                          </span>
                        ) : (
                          <span>
                            {dailyLeaders
                              .map((name, index) => (
                                <span key={name} className="capitalize">
                                  {name}
                                </span>
                              ))
                              .reduce((prev, curr, i) =>
                                i === 0 ? (
                                  curr
                                ) : i === dailyLeaders.length - 1 ? (
                                  <React.Fragment key={`${prev} and ${curr}`}>
                                    {prev} and {curr}
                                  </React.Fragment>
                                ) : (
                                  <>
                                    {prev}, {curr}
                                  </>
                                ),
                              )}{" "}
                            are tied today! 🤝 ({dailyMaxCount})
                          </span>
                        )}
                      </motion.div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="alltime">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              <Card className="border-2 border-amber-300 bg-white/80 rounded-xl shadow-lg overflow-hidden">
                <CardHeader className="bg-amber-600 text-white">
                  <CardTitle className="text-center text-2xl">All-Time Leaderboard</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {allUsers.map((user) => (
                      <div key={user}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-lg text-amber-800 capitalize">{user}</span>
                          <motion.span
                            className="font-bold text-2xl text-amber-800"
                            key={`alltime-${personCounts[user] || 0}`}
                            initial={{ scale: 1.5 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring" }}
                          >
                            {personCounts[user] || 0}
                          </motion.span>
                        </div>
                        <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.5 }}>
                          <Progress
                            value={totalCount ? ((personCounts[user] || 0) / totalCount) * 100 : 0}
                            className="h-4 bg-amber-100"
                            indicatorClassName="bg-gradient-to-r from-amber-400 to-amber-600"
                          />
                        </motion.div>
                      </div>
                    ))}

                    {totalCount > 0 && (
                      <motion.div
                        className="mt-6 text-center font-bold text-xl bg-amber-100 p-3 rounded-lg border-2 border-amber-300"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        {allTimeLeaders.length === 0 ? (
                          "No beers yet!"
                        ) : allTimeLeaders.length === 1 ? (
                          <span className="capitalize">{allTimeLeaders[0]} is the all-time champion! 🏆</span>
                        ) : (
                          <span>
                            {allTimeLeaders
                              .map((name, index) => (
                                <span key={name} className="capitalize">
                                  {name}
                                </span>
                              ))
                              .reduce((prev, curr, i) =>
                                i === 0 ? (
                                  curr
                                ) : i === allTimeLeaders.length - 1 ? (
                                  <React.Fragment key={`${prev} and ${curr}`}>
                                    {prev} and {curr}
                                  </React.Fragment>
                                ) : (
                                  <>
                                    {prev}, {curr}
                                  </>
                                ),
                              )}{" "}
                            are tied all-time! 🤝 ({allTimeMaxCount})
                          </span>
                        )}
                      </motion.div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Camera component for capturing photos */}
        <CameraCapture isOpen={isCameraOpen} onClose={handleCameraClose} onCapture={handlePhotoCapture} />
      </div>
    </>
  )
}

