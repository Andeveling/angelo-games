// src/scenes/MainScene.ts
import { getAllUpgrades } from "@/config/upgrades"
import Player from "@/entities/Player"
import EnemyManager from "@/managers/EnemyManager"
import SpawnManager from "@/managers/SpawnManager"
import Phaser from "phaser"

window.addEventListener("contextmenu", (e) => e.preventDefault())

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
  spawnManager!: SpawnManager
  timeText!: Phaser.GameObjects.Text
  killText!: Phaser.GameObjects.Text
  hpText!: Phaser.GameObjects.Text
  levelText!: Phaser.GameObjects.Text
  cooldownText!: Phaser.GameObjects.Text
  upgradeTexts!: Phaser.GameObjects.Text[]
  spawnTimer!: Phaser.Time.TimerEvent

  constructor() {
    super({ key: "MainScene" })
  }

  preload(): void {
    // Carga de assets si es necesario
  }

  create(): void {
    // Inicializar estado
    this.startTime = this.time.now
    this.killCount = 0
    this.playerXp = 0
    this.playerLevel = 1
    this.xpToNext = 10
    this.isPausedForUpgrade = false
    this.hasMagnetism = false
    this.magnetRadius = 0

    // Crear jugador en posición central
    this.player = new Player(this, 400, 300, {
      maxHp: 100,
      hp: 100,
      moveSpeed: 100,
      baseDamage: 10,
      attackRate: 500,
      attackRange: 80,
    })

    // Grupos de Phaser para colisiones
    this.enemies = this.physics.add.group()
    this.xpOrbs = this.physics.add.group()

    // Managers
    this.enemyManager = new EnemyManager(this)
    this.spawnManager = new SpawnManager(this, this.enemyManager)

    // Deshabilitar menú contextual
    if (this.input && this.input.mouse) {
      this.input.mouse.disableContextMenu()
    }

    // UI texto
    this.timeText = this.add
      .text(10, 10, "", {
        fontSize: "16px",
        color: "#ffffff",
      })
      .setScrollFactor(0)
    this.killText = this.add
      .text(10, 30, "", {
        fontSize: "16px",
        color: "#ffffff",
      })
      .setScrollFactor(0)
    this.hpText = this.add
      .text(10, 50, "", {
        fontSize: "16px",
        color: "#ffffff",
      })
      .setScrollFactor(0)
    this.levelText = this.add
      .text(10, 70, "", {
        fontSize: "16px",
        color: "#ffffff",
      })
      .setScrollFactor(0)
    this.cooldownText = this.add
      .text(10, 90, "", {
        fontSize: "16px",
        color: "#ffffff",
      })
      .setScrollFactor(0)

    // Colisión jugador-enemigos para daño de contacto
    this.physics.add.overlap(this.player.container, this.enemies, (plyObj, eneObj) => {
      const enemy = this.enemyManager.enemies.find((e) => e.container === eneObj)
      if (enemy && !this.isPausedForUpgrade) {
        if (enemy.stats.contactDamage) {
          this.player.damage(enemy.stats.contactDamage)
        }
      }
    })

    // Auto-ataque del jugador ya inicializado en Player constructor
    // Timers de spawn: llamamos spawnLogic cada 0.5s o 1s según prefieras
    this.spawnTimer = this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        if (!this.isPausedForUpgrade) {
          this.spawnManager.spawnLogic()
        }
      },
    })
  }

  update(time: number, delta: number): void {
    // UI de tiempo y estadísticas
    const seconds = Math.floor((time - this.startTime) / 1000)
    this.timeText.setText("Tiempo: " + seconds + "s")
    this.killText.setText("Muertes: " + this.killCount)
    this.hpText.setText(`Vida: ${this.player.stats.hp}/${this.player.stats.maxHp}`)
    this.levelText.setText(`Nivel: ${this.playerLevel} XP: ${this.playerXp}/${this.xpToNext}`)
    // UI de cooldown de habilidad
    const now = this.time.now
    const rem = Math.max(0, ((this.player as any).specialCooldownUntil ?? 0) - now) / 1000
    this.cooldownText.setText(rem > 0 ? `Habilidad: ${rem.toFixed(1)}s` : "Habilidad lista")

    if (!this.isPausedForUpgrade) {
      // Actualizar jugador
      this.player.update(time, delta)
      // Actualizar enemigos
      this.enemyManager.updateAll()
      // Actualizar SpawnManager (oleadas, boss, etc.)
      this.spawnManager.update()
    }
  }

  // Funciones de spawn de XP y nivel permanecen igual
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
    // elegir 3 al azar
    options.sort(() => 0.5 - Math.random())
    options.slice(0, 3).forEach((opt, idx) => {
      const y = h / 2 - 60 + idx * 60
      const txt = this.add
        .text(w / 2, y, opt.label, {
          fontSize: "20px",
          color: "#ffffff",
        })
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

  getSpawnPosition(): { x: number; y: number } {
    const w = this.scale.width
    const h = this.scale.height
    const edge = Phaser.Math.Between(0, 3)
    let x: number, y: number
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

  handleGameOver(): void {
    this.isPausedForUpgrade = true
    // Mostrar texto de Game Over
    const w = this.scale.width
    const h = this.scale.height
    const panel = this.add.rectangle(w / 2, h / 2, 400, 200, 0x000000, 0.7)
    const txt = this.add
      .text(w / 2, h / 2 - 20, "Game Over", {
        fontSize: "32px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
    const info = this.add
      .text(w / 2, h / 2 + 20, "Click para reiniciar", {
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
    ;[panel, txt, info].forEach((obj) => {
      obj.setInteractive()
      obj.on("pointerdown", () => {
        this.scene.restart()
      })
    })
  }

  // Si necesitas spawnLogic local, delegar a SpawnManager:
  // Ya integrado en spawnTimer llamando spawnManager.spawnLogic()

  // El método chooseEnemyType ya está dentro de SpawnManager;
  // aquí no es necesario a menos que tengas lógica adicional.
}
