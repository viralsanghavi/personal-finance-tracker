import { useEffect, useRef } from "react"
import * as THREE from "three"

type ThreeCanvasProps = {
  className?: string
  tint?: string
  intensity?: number
  speed?: number
}

export function ThreeCanvas({ className, tint = "#34d399", intensity = 0.8, speed = 0.25 }: ThreeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
    camera.position.z = 4

    const ambient = new THREE.AmbientLight(0xffffff, intensity)
    scene.add(ambient)

    const point = new THREE.PointLight(tint, 1.5)
    point.position.set(2, 1, 3)
    scene.add(point)

    const geometry = new THREE.SphereGeometry(1, 48, 48)
    const material = new THREE.MeshStandardMaterial({
      color: tint,
      roughness: 0.35,
      metalness: 0.6,
      transparent: true,
      opacity: 0.6,
    })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    let frame = 0
    let animationId = 0

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const { width, height } = parent.getBoundingClientRect()
      renderer.setSize(width, height, false)
      camera.aspect = width / Math.max(height, 1)
      camera.updateProjectionMatrix()
    }

    resize()
    const observer = new ResizeObserver(resize)
    if (canvas.parentElement) observer.observe(canvas.parentElement)

    const animate = () => {
      frame += speed
      mesh.rotation.y = frame * 0.01
      mesh.rotation.x = frame * 0.006
      renderer.render(scene, camera)
      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationId)
      observer.disconnect()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }, [intensity, speed, tint])

  return <canvas ref={canvasRef} className={className} />
}
