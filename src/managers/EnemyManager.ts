import { type EnemyType } from "@/config/enemies"
import Enemy from "@/entities/Enemy"

export default class EnemyManager {
  scene: Phaser.Scene
  enemies: Enemy[]

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.enemies = []
  }

  spawn(type: EnemyType): void {
    const pos = (this.scene as any).getSpawnPosition()
    const enemy = new Enemy(this.scene, type, pos.x, pos.y)
    this.enemies.push(enemy)
    ;(this.scene as any).enemies.add(enemy.container)
  }

  updateAll(): void {
    this.enemies = this.enemies.filter((e) => e.active)
    this.enemies.forEach((e) => e.update())
  }

  damageEnemiesInRange(x: number, y: number, range: number, dmg: number): void {
    this.enemies.forEach((e) => {
      const dx = e.container.x - x
      const dy = e.container.y - y
      if (dx * dx + dy * dy <= range * range) {
        e.takeDamage(dmg)
      }
    })
  }
}
