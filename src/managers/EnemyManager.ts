import { type EnemyType } from "@/config/enemies"
import Enemy from "@/entities/Enemy"
import type MainScene from "@/scenes/MainScene"

export default class EnemyManager {
  scene: Phaser.Scene
  enemies: Enemy[]

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.enemies = []
  }

  // Ahora retorna Enemy en lugar de void
  spawn(type: EnemyType): Enemy {
    // Hacer cast a MainScene para llamar getSpawnPosition
    const mainScene = this.scene as MainScene
    const pos = mainScene.getSpawnPosition()
    const enemy = new Enemy(this.scene, type, pos.x, pos.y)
    this.enemies.push(enemy)
    // Añadir al grupo de Phaser
    ;(mainScene.enemies as Phaser.Physics.Arcade.Group).add(enemy.container)
    return enemy
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
