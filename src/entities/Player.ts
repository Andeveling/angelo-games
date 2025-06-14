import Phaser from "phaser"

export interface PlayerStats {
  maxHp: number
  hp: number
  moveSpeed: number
  baseDamage: number
  attackRate: number
  attackRange: number
}

export default class Player {
  scene: Phaser.Scene
  stats: PlayerStats
  container: Phaser.GameObjects.Container & { body: Phaser.Physics.Arcade.Body }
  cursor: Phaser.Types.Input.Keyboard.CursorKeys
  attackTimer?: Phaser.Time.TimerEvent
  invulnerableUntil: number

  constructor(scene: Phaser.Scene, x: number, y: number, stats: PlayerStats) {
    this.scene = scene
    this.stats = { ...stats }
    this.container = this.scene.add.container(x, y) as any
    const radius = 12
    const g = this.scene.add.graphics()
    g.fillStyle(0xffffff, 1)
    g.fillCircle(0, 0, radius)
    g.lineStyle(2, 0xffffff, 1)
    g.strokeLineShape(new Phaser.Geom.Line(0, 0, radius, 0))
    this.container.add(g)
    this.scene.physics.add.existing(this.container)
    this.container.body.setCircle(radius)
    this.container.body.setCollideWorldBounds(true)
    this.cursor = this.scene.input!.keyboard!.createCursorKeys()
    this.invulnerableUntil = 0
    this.initAutoAttack()
  }

  initAutoAttack(): void {
    if (this.attackTimer) {
      this.attackTimer.remove()
    }
    this.attackTimer = this.scene.time.addEvent({
      delay: this.stats.attackRate,
      loop: true,
      callback: () => {
        const mainScene = this.scene as any
        if (!mainScene.isPausedForUpgrade) this.autoAttack()
      },
    })
  }

  autoAttack(): void {
    const px = this.container.x
    const py = this.container.y
    const range = this.stats.attackRange
    const g = this.scene.add.graphics()
    g.fillStyle(0xffff00, 0.3)
    g.fillCircle(px, py, range)
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 200,
      onComplete: () => g.destroy(),
    })
    const mainScene = this.scene as any
    mainScene.enemyManager.damageEnemiesInRange(px, py, range, this.stats.baseDamage)
  }

  update(time: number, delta: number): void {
    const mainScene = this.scene as any
    if (mainScene.isPausedForUpgrade) return
    this.handleMovement()
    this.applyInvulnerability(time)
    if (mainScene.hasMagnetism) this.applyMagnetism()
  }

  handleMovement(): void {
    const speed = this.stats.moveSpeed
    let vx = 0
    let vy = 0
    if (this.cursor.left?.isDown) vx = -1
    else if (this.cursor.right?.isDown) vx = 1
    if (this.cursor.up?.isDown) vy = -1
    else if (this.cursor.down?.isDown) vy = 1
    if (vx !== 0 || vy !== 0) {
      const norm = Math.hypot(vx, vy) || 1
      vx = (vx / norm) * speed
      vy = (vy / norm) * speed
    }
    this.container.body.setVelocity(vx, vy)
  }

  damage(dmg: number): void {
    const now = this.scene.time.now
    if (now < this.invulnerableUntil) return
    this.stats.hp -= dmg
    this.invulnerableUntil = now + 500
    this.scene.cameras.main.flash(100, 255, 0, 0)
    if (this.stats.hp <= 0) {
      const mainScene = this.scene as any
      mainScene.handleGameOver()
    }
  }

  applyInvulnerability(time: number): void {
    // placeholder para efectos visuales
  }

  applyMagnetism(): void {
    const mainScene = this.scene as any
    const px = this.container.x
    const py = this.container.y
    mainScene.xpOrbs.getChildren().forEach((orbObj: any) => {
      const orb = orbObj as Phaser.GameObjects.Container & { body: Phaser.Physics.Arcade.Body }
      const dx = px - orb.x
      const dy = py - orb.y
      const dist2 = dx * dx + dy * dy
      if (dist2 < mainScene.magnetRadius * mainScene.magnetRadius) {
        const len = Math.hypot(dx, dy) || 1
        const v = 100
        orb.body.setVelocity((dx / len) * v, (dy / len) * v)
      }
    })
  }
}
