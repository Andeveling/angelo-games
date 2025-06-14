// src/scenes/MainScene.ts
import { getAllUpgrades } from "@/config/upgrades"
import Phaser from "phaser"
import { EnemyTypes } from "../config/enemies"
import Player from "../entities/Player"
import EnemyManager from "../managers/EnemyManager"

export default class MainScene extends Phaser.Scene {
  startTime!: number
  killCount!: number
  playerXp!: number
  playerLevel!: number
  xpToNext!: number
  isPausedForUpgrade!: boolean
  hasMagnetism!: boolean
  magnetRadius!: number
  player!: Player
  enemies!: Phaser.Physics.Arcade.Group
  xpOrbs!: Phaser.Physics.Arcade.Group
  enemyManager!: EnemyManager
  timeText!: Phaser.GameObjects.Text
  killText!: Phaser.GameObjects.Text
  hpText!: Phaser.GameObjects.Text
  levelText!: Phaser.GameObjects.Text
  upgradeTexts!: Phaser.GameObjects.Text[]
  spawnTimer!: Phaser.Time.TimerEvent

  constructor() {
    super({ key: "MainScene" })
  }

  preload(): void {
    // Carga de assets si es necesario
  }

  create(): void {
    this.startTime = this.time.now
    this.killCount = 0
    this.playerXp = 0
    this.playerLevel = 1
    this.xpToNext = 10
    this.isPausedForUpgrade = false
    this.hasMagnetism = false
    this.magnetRadius = 0

    this.player = new Player(this, 400, 300, {
      maxHp: 100,
      hp: 100,
      moveSpeed: 100,
      baseDamage: 10,
      attackRate: 500,
      attackRange: 80,
    })

    this.enemies = this.physics.add.group()
    this.xpOrbs = this.physics.add.group()
    this.enemyManager = new EnemyManager(this)

    this.timeText = this.add
      .text(10, 10, "", {
        fontSize: "16px",
        color: "#ffffff", // ✅ usa color en lugar de fill
      })
      .setScrollFactor(0)
    this.killText = this.add
      .text(10, 30, "", {
        fontSize: "16px",
        color: "#ffffff", // ✅ usa color en lugar de fill
      })
      .setScrollFactor(0)
    this.hpText = this.add
      .text(10, 50, "", {
        fontSize: "16px",
        color: "#ffffff", // ✅ usa color en lugar de fill
      })
      .setScrollFactor(0)
    this.levelText = this.add
      .text(10, 70, "", {
        fontSize: "16px",
        color: "#ffffff", // ✅ usa color en lugar de fill
      })
      .setScrollFactor(0)

    // this.killText = this.add.text(10, 30, "", { fontSize: "16px", fill: "#fff" }).setScrollFactor(0)
    // this.hpText = this.add.text(10, 50, "", { fontSize: "16px", fill: "#fff" }).setScrollFactor(0)
    // this.levelText = this.add.text(10, 70, "", { fontSize: "16px", fill: "#fff" }).setScrollFactor(0)

    this.physics.add.overlap(this.player.container, this.enemies, (plyObj, eneObj) => {
      const enemy = this.enemyManager.enemies.find((e) => e.container === eneObj)
      if (enemy && !this.isPausedForUpgrade) {
        enemy.stats.contactDamage && this.player.damage(enemy.stats.contactDamage)
      }
    })

    this.player.initAutoAttack()
    this.spawnTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (!this.isPausedForUpgrade) this.spawnLogic()
      },
    })
  }

  update(time: number, delta: number): void {
    const seconds = Math.floor((time - this.startTime) / 1000)
    this.timeText.setText("Tiempo: " + seconds + "s")
    this.killText.setText("Muertes: " + this.killCount)
    this.hpText.setText(`Vida: ${this.player.stats.hp}/${this.player.stats.maxHp}`)
    this.levelText.setText(`Nivel: ${this.playerLevel} XP: ${this.playerXp}/${this.xpToNext}`)
    if (!this.isPausedForUpgrade) {
      this.player.update(time, delta)
      this.enemyManager.updateAll()
    }
  }

  spawnLogic(): void {
    const elapsed = this.time.now - this.startTime
    const prob = Phaser.Math.Clamp(0.02 + elapsed / 600000, 0, 0.5)
    if (Phaser.Math.FloatBetween(0, 1) < prob) {
      const type = this.chooseEnemyType(elapsed)
      this.enemyManager.spawn(type)
    }
  }

  chooseEnemyType(elapsed: number) {
    if (elapsed < 30000) return EnemyTypes[0]
    else if (elapsed < 60000) return Phaser.Math.FloatBetween(0, 1) < 0.5 ? EnemyTypes[0] : EnemyTypes[1]
    else {
      const r = Phaser.Math.FloatBetween(0, 1)
      if (r < 0.4) return EnemyTypes[0]
      else if (r < 0.7) return EnemyTypes[1]
      else return EnemyTypes[2]
    }
  }

  getSpawnPosition(): { x: number; y: number } {
    const w = this.scale.width
    const h = this.scale.height
    const edge = Phaser.Math.Between(0, 3)
    let x: number
    let y: number
    if (edge === 0) {
      x = Phaser.Math.Between(0, w)
      y = -20
    } else if (edge === 1) {
      x = Phaser.Math.Between(0, w)
      y = h + 20
    } else if (edge === 2) {
      x = -20
      y = Phaser.Math.Between(0, h)
    } else {
      x = w + 20
      y = Phaser.Math.Between(0, h)
    }
    return { x, y }
  }

  spawnXpOrb(x: number, y: number, xp: number): void {
    const orbG = this.add.graphics()
    orbG.fillStyle(0x00ff00, 1)
    orbG.fillCircle(0, 0, 5)
    const cont = this.add.container(x, y) as any
    cont.add(orbG)
    this.physics.add.existing(cont)
    cont.body.setCircle(5)
    this.xpOrbs.add(cont)
    this.physics.add.overlap(this.player.container, cont, (_ply, o) => {
      this.playerXp += xp
      o.destroy()
      this.checkLevelUp()
    })
  }

  checkLevelUp(): void {
    if (this.playerXp >= this.xpToNext) {
      this.playerXp -= this.xpToNext
      this.playerLevel++
      this.xpToNext = Math.floor(10 * Math.pow(1.2, this.playerLevel - 1))
      this.pauseAndShowLevelUpChoices()
    }
  }

  pauseAndShowLevelUpChoices(): void {
    this.isPausedForUpgrade = true
    this.player.container.body.setVelocity(0, 0)
    const w = this.scale.width
    const h = this.scale.height
    const panel = this.add.rectangle(w / 2, h / 2, 500, 300, 0x000000, 0.7)
    const options = getAllUpgrades(this)
    this.upgradeTexts = []
    options.sort(() => 0.5 - Math.random())
    options.slice(0, 3).forEach((opt, idx) => {
      const y = h / 2 - 60 + idx * 60
      const txt = this.add
        .text(w / 2, y, opt.label, { fontSize: "20px", color: "#fff" }) // ✅ color en vez de fill
        .setOrigin(0.5)
        .setInteractive()

      txt.on("pointerdown", () => {
        opt.apply()
        panel.destroy()
        this.upgradeTexts.forEach((t) => t.destroy())
        this.isPausedForUpgrade = false
      })
      this.upgradeTexts.push(txt)
    })
  }
}
