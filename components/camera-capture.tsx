"use client"

import { useRef, useState, useEffect } from "react"
import { Camera, FlipHorizontal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface CameraCaptureProps {
  onCapture: (imageData: string) => void
  isOpen: boolean
  onClose: () => void
}

export function CameraCapture({ onCapture, isOpen, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const [error, setError] = useState<string | null>(null)

  const startCamera = async () => {
    try {
      console.log("Starting camera with facing mode:", facingMode)

      // Stop any existing stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }

      // Request camera access
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      setStream(newStream)

      if (videoRef.current) {
        videoRef.current.srcObject = newStream
        videoRef.current.onloadedmetadata = () => {
          setIsCameraReady(true)
        }
      }

      setError(null)
    } catch (err) {
      console.error("Error accessing camera:", err)
      console.error("Camera error details:", JSON.stringify(err))
      setError("Could not access camera. Please ensure you've granted camera permissions.")
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setIsCameraReady(false)
  }

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"))
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && isCameraReady) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext("2d")

      if (context) {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        // Draw the current video frame to the canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height)

        // Convert canvas to data URL (base64 image)
        const imageData = canvas.toDataURL("image/jpeg", 0.8)

        // Pass the image data to the parent component
        onCapture(imageData)

        // Stop the camera
        stopCamera()

        // Close the dialog
        onClose()
      }
    }
  }

  // Start camera when dialog opens and stop when it closes
  useEffect(() => {
    if (isOpen) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [isOpen, facingMode])

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          stopCamera()
          onClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Take a photo of your drink</DialogTitle>
          <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogHeader>

        <div className="relative">
          {error && <div className="p-4 bg-red-100 text-red-800 rounded-md mb-4">{error}</div>}

          <div className="relative aspect-video bg-black rounded-md overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="flex justify-between mt-4">
            <Button type="button" variant="outline" onClick={toggleCamera} disabled={!isCameraReady}>
              <FlipHorizontal className="mr-2 h-4 w-4" />
              Flip Camera
            </Button>

            <Button
              type="button"
              onClick={capturePhoto}
              disabled={!isCameraReady}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Camera className="mr-2 h-4 w-4" />
              Take Photo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

