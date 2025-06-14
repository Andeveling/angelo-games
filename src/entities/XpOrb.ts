// src/entities/XpOrb.ts
import Phaser from "phaser"

export default class XpOrb {
  scene: Phaser.Scene
  xp: number
  container: Phaser.GameObjects.Container & { body: Phaser.Physics.Arcade.Body }
  active: boolean

  constructor(scene: Phaser.Scene, x: number, y: number, xp: number) {
    this.scene = scene
    this.xp = xp
    this.container = this.scene.add.container(x, y) as any
    const g = this.scene.add.graphics()
    g.fillStyle(0x00ff00, 1)
    g.fillCircle(0, 0, 5)
    this.container.add(g)
    this.scene.physics.add.existing(this.container)
    this.container.body.setCircle(5)
    this.active = true
    this.scene.physics.add.overlap(this.container, (this.scene as any).player.container, () => {
      if (!this.active) return
      const mainScene = this.scene as any
      mainScene.playerXp += this.xp
      this.active = false
      this.container.destroy()
      mainScene.checkLevelUp()
    })
  }
}
