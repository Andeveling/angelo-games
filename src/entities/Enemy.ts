// src/entities/Enemy.ts
import Phaser from "phaser"
import { type EnemyType } from "@/config/enemies"

export default class Enemy {
  scene: Phaser.Scene
  type: EnemyType
  stats: { hp: number; speed: number; xp: number; contactDamage?: number }
  container: Phaser.GameObjects.Container & { body: Phaser.Physics.Arcade.Body }
  active: boolean
  onDieCallback?: () => void // ✅ AÑADIDO

  constructor(scene: Phaser.Scene, type: EnemyType, x: number, y: number) {
    this.scene = scene
    this.type = type
    this.stats = { hp: type.hp, speed: type.speed, xp: type.xp, contactDamage: type.contactDamage }
    this.container = this.scene.add.container(x, y) as any
    const g = this.scene.add.graphics()
    g.fillStyle(type.color)
    if (type.shape === "bat") {
      const size = 12
      const points = [
        { x: 0, y: -size },
        { x: size, y: size },
        { x: -size, y: size },
      ]
      const poly = new Phaser.Geom.Polygon(points)
      g.fillPoints(poly.points, true)
    } else if (type.shape === "skeleton") {
      g.fillRect(-8, -12, 16, 24)
      g.fillCircle(0, -16, 8)
    } else {
      g.fillCircle(0, 0, 14)
    }
    this.container.add(g)
    this.scene.physics.add.existing(this.container)
    const radius = type.shape === "zombie" ? 14 : 12
    this.container.body.setCircle(radius)
    this.container.body.setCollideWorldBounds(false)
    this.active = true
  }

  update(): void {
    if (!this.active) return
    const mainScene = this.scene as any
    const player = mainScene.player
    const dx = player.container.x - this.container.x
    const dy = player.container.y - this.container.y
    const len = Math.hypot(dx, dy) || 1
    this.container.body.setVelocity((dx / len) * this.stats.speed, (dy / len) * this.stats.speed)
  }

  takeDamage(dmg: number): void {
    this.stats.hp -= dmg
    if (this.stats.hp <= 0) this.die()
  }

  die(): void {
    const px = this.container.x
    const py = this.container.y
    const g = this.scene.add.graphics()
    g.fillStyle(0xff0000, 0.5)
    g.fillCircle(0, 0, this.type.deathRadius || 16)
    const fx = this.scene.add.container(px, py, [g])
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      scale: { from: 1, to: 2 },
      duration: 200,
      onComplete: () => {
        g.destroy()
        fx.destroy()
      },
    })
    if (this.onDieCallback) {
      this.onDieCallback()
    }
    const mainScene = this.scene as any
    mainScene.spawnXpOrb(px, py, this.stats.xp)
    this.destroy()
    mainScene.killCount++
  }

  destroy(): void {
    this.active = false
    this.container.destroy()
  }
}
