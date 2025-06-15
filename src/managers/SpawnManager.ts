import Phaser from "phaser"
import { type EnemyType, EnemyTypes } from "../config/enemies"
import EnemyManager from "./EnemyManager"

export default class SpawnManager {
  scene: Phaser.Scene
  enemyManager: EnemyManager
  startTime: number
  waveInterval: number
  nextWaveTime: number
  spawnPaused: boolean

  constructor(scene: Phaser.Scene, enemyManager: EnemyManager) {
    this.scene = scene
    this.enemyManager = enemyManager
    this.startTime = this.scene.time.now
    this.waveInterval = 30000 // cada 30s se considera oleada
    this.nextWaveTime = this.startTime + this.waveInterval
    this.spawnPaused = false
  }

  update(): void {
    const now = this.scene.time.now
    if (now >= this.nextWaveTime) {
      this.onWave()
      this.nextWaveTime += this.waveInterval
    }
  }

  spawnLogic(): void {
    if (this.spawnPaused) return
    const elapsed = this.scene.time.now - this.startTime
    // Probabilidad base creciente con tiempo
    let baseProb = 0.02 + elapsed / 300000 // a 5 min ~0.02+300k/300k=1.02, luego clamp
    baseProb = Phaser.Math.Clamp(baseProb, 0.02, 0.7)

    if (Phaser.Math.FloatBetween(0, 1) < baseProb) {
      // Elegir tipo según elapsed
      const type = this.chooseEnemyType(elapsed)
      // Clonar y escalar stats según elapsed (factor suave)
      const factor = 1 + elapsed / 600000 // a 10 min factor ~2
      const scaled: EnemyType = {
        ...type,
        hp: Math.floor(type.hp * factor),
        speed: type.speed * factor,
        xp: Math.floor(type.xp * factor),
        // contactDamage opcionalmente también:
        contactDamage: type.contactDamage ? Math.floor(type.contactDamage * factor) : undefined,
        deathRadius: type.deathRadius,
      }
      this.enemyManager.spawn(scaled)
    }
  }

  chooseEnemyType(elapsed: number): EnemyType {
    // Selección progresiva:
    if (elapsed < 30000) {
      // primeros 30s: solo zombies
      return EnemyTypes.find((e) => e.id === "zombie")!
    } else if (elapsed < 60000) {
      // 30-60s: zombies y bats
      return Phaser.Math.FloatBetween(0, 1) < 0.6 ? EnemyTypes.find((e) => e.id === "zombie")! : EnemyTypes.find((e) => e.id === "bat")!
    } else if (elapsed < 120000) {
      // 1-2 min: skeletons y algun brute ocasional
      const r = Phaser.Math.FloatBetween(0, 1)
      if (r < 0.4) return EnemyTypes.find((e) => e.id === "zombie")!
      else if (r < 0.7) return EnemyTypes.find((e) => e.id === "skeleton")!
      else return EnemyTypes.find((e) => e.id === "brute")!
    } else {
      // >2 min: incluir elite con baja probabilidad
      const r = Phaser.Math.FloatBetween(0, 1)
      if (r < 0.3) return EnemyTypes.find((e) => e.id === "zombie")!
      else if (r < 0.6) return EnemyTypes.find((e) => e.id === "skeleton")!
      else if (r < 0.85) return EnemyTypes.find((e) => e.id === "brute")!
      else return EnemyTypes.find((e) => e.id === "elite")!
    }
  }

  onWave(): void {
    // Ráfaga de spawn en oleada
    const elapsed = this.scene.time.now - this.startTime
    const count = Math.floor(3 + elapsed / 60000) // aumenta con cada minuto
    for (let i = 0; i < count; i++) {
      const type = this.chooseEnemyType(elapsed)
      const factor = 1 + elapsed / 300000 // más agresivo en oleada
      const scaled: EnemyType = {
        ...type,
        hp: Math.floor(type.hp * factor * 1.5),
        speed: type.speed * factor * 1.2,
        xp: Math.floor(type.xp * factor),
        contactDamage: type.contactDamage ? Math.floor(type.contactDamage * factor) : undefined,
        deathRadius: type.deathRadius,
      }
      this.enemyManager.spawn(scaled)
    }
    // Podrías pausar spawn hasta cierta condición, o anunciar oleada:
    const txt = this.scene.add
      .text(this.scene.scale.width / 2, 50, "¡Oleada!", {
        fontSize: "28px",
        color: "#ff0000",
      })
      .setOrigin(0.5)
    this.scene.tweens.add({
      targets: txt,
      alpha: { from: 1, to: 0 },
      duration: 2000,
      onComplete: () => txt.destroy(),
    })
  }

  // Opcional: spawn de boss grande tras cierto tiempo o kills
  spawnBoss(): void {
    // Define boss en config o inline:
    const bossType: EnemyType = {
      id: "boss1",
      hp: 1000,
      speed: 20,
      xp: 100,
      color: 0xff0000,
      shape: "zombie",
      contactDamage: 50,
      deathRadius: 40,
    }
    this.spawnPaused = true
    const boss = this.enemyManager.spawn(bossType)
    boss.onDieCallback = () => {
      this.spawnPaused = false
      console.log("Boss derrotado")
    }
    // Aviso visual
    const txt = this.scene.add
      .text(this.scene.scale.width / 2, this.scene.scale.height / 2, "¡Boss ha aparecido!", {
        fontSize: "32px",
        color: "#ffff00",
      })
      .setOrigin(0.5)
    this.scene.tweens.add({
      targets: txt,
      alpha: { from: 1, to: 0 },
      duration: 3000,
      onComplete: () => txt.destroy(),
    })
  }
}
