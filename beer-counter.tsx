"use client"

import { useState, useEffect } from "react"
import { Beer, Undo2, RefreshCw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getBeerCounts, incrementBeer, undoLastAction } from "@/app/actions"
import { useToast } from "@/components/ui/use-toast"

export default function BeerCounter() {
  const [aaronCount, setAaronCount] = useState(0)
  const [nickCount, setNickCount] = useState(0)
  const [lastAction, setLastAction] = useState<null | "aaron" | "nick">(null)
  const [canUndo, setCanUndo] = useState(false)
  const [showAaronAnimation, setShowAaronAnimation] = useState(false)
  const [showNickAnimation, setShowNickAnimation] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()

  const totalCount = aaronCount + nickCount
  const leader = aaronCount > nickCount ? "Aaron" : nickCount > aaronCount ? "Nick" : "Tied"

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getBeerCounts()
        setAaronCount(data.aaronCount)
        setNickCount(data.nickCount)
        setLastAction(data.lastAction)
        setCanUndo(data.canUndo)
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

  const handleAaronClick = async () => {
    setIsUpdating(true)
    setShowAaronAnimation(true)

    try {
      const result = await incrementBeer("aaron")
      setAaronCount(result.aaronCount)
      setNickCount(result.nickCount)
      setLastAction(result.lastAction)
      setCanUndo(result.canUndo)
    } catch (error) {
      toast({
        title: "Error updating count",
        description: "Could not update Aaron's beer count.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleNickClick = async () => {
    setIsUpdating(true)
    setShowNickAnimation(true)

    try {
      const result = await incrementBeer("nick")
      setAaronCount(result.aaronCount)
      setNickCount(result.nickCount)
      setLastAction(result.lastAction)
      setCanUndo(result.canUndo)
    } catch (error) {
      toast({
        title: "Error updating count",
        description: "Could not update Nick's beer count.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUndo = async () => {
    if (!canUndo) return

    setIsUpdating(true)
    try {
      const result = await undoLastAction()
      setAaronCount(result.aaronCount)
      setNickCount(result.nickCount)
      setLastAction(result.lastAction)
      setCanUndo(result.canUndo)
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

  const refreshData = async () => {
    setIsLoading(true)
    try {
      const data = await getBeerCounts()
      setAaronCount(data.aaronCount)
      setNickCount(data.nickCount)
      setLastAction(data.lastAction)
      setCanUndo(data.canUndo)

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

  useEffect(() => {
    if (showAaronAnimation) {
      const timer = setTimeout(() => setShowAaronAnimation(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [showAaronAnimation])

  useEffect(() => {
    if (showNickAnimation) {
      const timer = setTimeout(() => setShowNickAnimation(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [showNickAnimation])

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
    <div className="container mx-auto p-4 max-w-md bg-gradient-to-b from-amber-50 to-amber-100 min-h-screen rounded-xl shadow-inner">
      <div className="flex justify-between items-center mb-8 mt-4">
        <motion.h1
          className="text-4xl font-bold text-center text-amber-800 flex-1"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
        >
          🍻 Beer Counter 🍻
        </motion.h1>
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

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="relative">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="lg"
              className="h-32 w-full bg-gradient-to-br from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 rounded-xl shadow-lg flex flex-col items-center justify-center border-4 border-amber-300"
              onClick={handleAaronClick}
              disabled={isUpdating}
            >
              <Beer className="h-10 w-10 mb-2 text-amber-100" />
              <span className="text-xl font-bold text-amber-100">Aaron's Beer</span>
            </Button>
          </motion.div>

          <AnimatePresence>
            {showAaronAnimation && (
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

        <div className="relative">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="lg"
              className="h-32 w-full bg-gradient-to-br from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 rounded-xl shadow-lg flex flex-col items-center justify-center border-4 border-amber-300"
              onClick={handleNickClick}
              disabled={isUpdating}
            >
              <Beer className="h-10 w-10 mb-2 text-amber-100" />
              <span className="text-xl font-bold text-amber-100">Nick's Beer</span>
            </Button>
          </motion.div>

          <AnimatePresence>
            {showNickAnimation && (
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
      </div>

      <motion.div whileHover={{ scale: canUndo ? 1.05 : 1 }}>
        <Button
          variant="outline"
          className="w-full mb-8 mt-2 bg-white/80 border-2 border-amber-400 text-amber-800 font-bold py-3 rounded-xl shadow-md flex items-center justify-center gap-2"
          disabled={!canUndo || isUpdating}
          onClick={handleUndo}
        >
          <Undo2 className="h-5 w-5" />
          Undo Last Beer
        </Button>
      </motion.div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
        <Card className="mb-6 border-2 border-amber-300 bg-white/80 rounded-xl shadow-lg overflow-hidden">
          <CardHeader className="bg-amber-600 text-white">
            <CardTitle className="text-center text-2xl">Collective Tally</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <motion.div
              className="text-6xl font-bold text-center text-amber-800"
              key={totalCount}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {totalCount}
            </motion.div>
            <div className="text-center text-amber-600 mt-2 font-medium">Total Beers</div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
        <Card className="border-2 border-amber-300 bg-white/80 rounded-xl shadow-lg overflow-hidden">
          <CardHeader className="bg-amber-600 text-white">
            <CardTitle className="text-center text-2xl">Leaderboard</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-lg text-amber-800">Aaron</span>
                  <motion.span
                    className="font-bold text-2xl text-amber-800"
                    key={aaronCount}
                    initial={{ scale: 1.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" }}
                  >
                    {aaronCount}
                  </motion.span>
                </div>
                <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.5 }}>
                  <Progress
                    value={(aaronCount / (totalCount || 1)) * 100}
                    className="h-4 bg-amber-100"
                    indicatorClassName="bg-gradient-to-r from-amber-400 to-amber-600"
                  />
                </motion.div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-lg text-amber-800">Nick</span>
                  <motion.span
                    className="font-bold text-2xl text-amber-800"
                    key={nickCount}
                    initial={{ scale: 1.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" }}
                  >
                    {nickCount}
                  </motion.span>
                </div>
                <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.5 }}>
                  <Progress
                    value={(nickCount / (totalCount || 1)) * 100}
                    className="h-4 bg-amber-100"
                    indicatorClassName="bg-gradient-to-r from-amber-400 to-amber-600"
                  />
                </motion.div>
              </div>

              {totalCount > 0 && (
                <motion.div
                  className="mt-6 text-center font-bold text-xl bg-amber-100 p-3 rounded-lg border-2 border-amber-300"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {leader === "Tied" ? "It's a tie! 🤝" : `${leader} is winning! 🏆`}
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

