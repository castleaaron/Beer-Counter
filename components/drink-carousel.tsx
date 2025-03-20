"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getDrinkPhotos } from "@/app/actions"

interface DrinkPhoto {
  _id: string
  person: string
  imageData: string
  timestamp: string
}

export function DrinkCarousel() {
  const [photos, setPhotos] = useState<DrinkPhoto[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPhotos = async () => {
      try {
        setLoading(true)
        const fetchedPhotos = await getDrinkPhotos()
        setPhotos(fetchedPhotos)
        setCurrentIndex(0)
      } catch (error) {
        console.error("Error loading drink photos:", error)
      } finally {
        setLoading(false)
      }
    }

    loadPhotos()
  }, [])

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? photos.length - 1 : prevIndex - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex === photos.length - 1 ? 0 : prevIndex + 1))
  }

  if (loading) {
    return (
      <Card className="w-full border-2 border-amber-300 bg-white/80 rounded-xl shadow-lg overflow-hidden">
        <CardContent className="p-4 flex items-center justify-center h-64">
          <div className="animate-pulse text-amber-600">Loading drink photos...</div>
        </CardContent>
      </Card>
    )
  }

  if (photos.length === 0) {
    return (
      <Card className="w-full border-2 border-amber-300 bg-white/80 rounded-xl shadow-lg overflow-hidden">
        <CardContent className="p-4 flex items-center justify-center h-64">
          <div className="text-amber-600 text-center">
            <p>No drink photos yet today!</p>
            <p className="text-sm mt-2">Take a photo when you log your next drink.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentPhoto = photos[currentIndex]
  const formattedTime = new Date(currentPhoto.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <Card className="w-full border-2 border-amber-300 bg-white/80 rounded-xl shadow-lg overflow-hidden">
      <CardContent className="p-4">
        <div className="relative aspect-video bg-black rounded-md overflow-hidden">
          <img
            src={currentPhoto.imageData || "/placeholder.svg"}
            alt={`${currentPhoto.person}'s drink`}
            className="w-full h-full object-cover"
          />

          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 flex justify-between items-center">
            <span className="capitalize font-bold">{currentPhoto.person}</span>
            <span className="text-sm">{formattedTime}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 text-white hover:bg-black/50"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-6 w-6" />
            <span className="sr-only">Previous</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 text-white hover:bg-black/50"
            onClick={goToNext}
          >
            <ChevronRight className="h-6 w-6" />
            <span className="sr-only">Next</span>
          </Button>
        </div>

        <div className="flex justify-center mt-2">
          {photos.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 mx-1 rounded-full ${index === currentIndex ? "bg-amber-600" : "bg-amber-300"}`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

