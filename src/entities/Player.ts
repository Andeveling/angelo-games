import Phaser from "phaser"
import Enemy from "@/entities/Enemy" // Ajusta la ruta según tu proyecto

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
  orbitRotationSpeed: number = Math.PI // rad/s
  container: Phaser.GameObjects.Container & { body: Phaser.Physics.Arcade.Body }

  // Controles WASD + flechas
  cursor!: {
    up: Phaser.Input.Keyboard.Key
    down: Phaser.Input.Keyboard.Key
    left: Phaser.Input.Keyboard.Key
    right: Phaser.Input.Keyboard.Key
    up2: Phaser.Input.Keyboard.Key
    down2: Phaser.Input.Keyboard.Key
    left2: Phaser.Input.Keyboard.Key
    right2: Phaser.Input.Keyboard.Key
  }

  attackTimer?: Phaser.Time.TimerEvent
  invulnerableUntil = 0
  specialCooldownUntil = 0

  // Habilidades desbloqueadas por upgrades
  hasOrbitAbility = false
  hasBombAbility = false

  // Para orbes giratorios
  orbitActive = false
  orbitOrbs: Phaser.GameObjects.Arc[] = []
  currentOrbAngles: number[] = []
  orbitRadius = 50
  baseOrbitRotationSpeed = Math.PI // rad/s a velocidad base 100
  orbitDamage = 5
  orbitDamageInterval = 500 // ms
  lastOrbDamage: Map<Enemy, number> = new Map()

  constructor(scene: Phaser.Scene, x: number, y: number, stats: PlayerStats) {
    this.scene = scene
    this.stats = { ...stats }

    // Crear container del jugador
    this.container = this.scene.add.container(x, y) as any
    // Dibujo minimalista
    const radius = 12
    const g = this.scene.add.graphics()
    g.fillStyle(0xffffff, 1)
    g.fillCircle(0, 0, radius)
    g.lineStyle(2, 0xffffff, 1)
    g.strokeLineShape(new Phaser.Geom.Line(0, 0, radius, 0))
    this.container.add(g)

    // Física
    this.scene.physics.add.existing(this.container)
    this.container.body.setCircle(radius)
    this.container.body.setCollideWorldBounds(true)

    // Configurar teclas WASD + flechas

    if (this.scene.input && this.scene.input.keyboard) {
      const keys = this.scene.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        up2: Phaser.Input.Keyboard.KeyCodes.UP,
        down2: Phaser.Input.Keyboard.KeyCodes.DOWN,
        left2: Phaser.Input.Keyboard.KeyCodes.LEFT,
        right2: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      }) as Record<string, Phaser.Input.Keyboard.Key>

      this.cursor = {
        up: keys.up!,
        down: keys.down!,
        left: keys.left!,
        right: keys.right!,
        up2: keys.up2!,
        down2: keys.down2!,
        left2: keys.left2!,
        right2: keys.right2!,
      }
    }
    this.initControls()
    // this.initAutoAttack()
  }

  // // Configura auto-ataque periódico
  // initAutoAttack(): void {
  //   if (this.attackTimer) {
  //     this.attackTimer.remove()
  //   }
  //   this.attackTimer = this.scene.time.addEvent({
  //     delay: this.stats.attackRate,
  //     loop: true,
  //     callback: () => {
  //       const mainScene = this.scene as any
  //       if (!mainScene.isPausedForUpgrade) {
  //         this.autoAttack()
  //       }
  //     },
  //   })
  // }

  // Auto-ataque en área
  autoAttack(): void {
    const px = this.container.x
    const py = this.container.y
    const range = this.stats.attackRange
    // Efecto visual área
    const g = this.scene.add.graphics()
    g.fillStyle(0xffff00, 0.3)
    g.fillCircle(px, py, range)
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 200,
      onComplete: () => g.destroy(),
    })
    // Daño en área
    const mainScene = this.scene as any
    mainScene.enemyManager.damageEnemiesInRange(px, py, range, this.stats.baseDamage)
  }

  // Configura listeners de clics
  initControls(): void {
    if (this.scene.input && this.scene.input.mouse) {
      this.scene.input.mouse.disableContextMenu()
    }
    this.scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.manualAttack(pointer)
      } else if (pointer.rightButtonDown()) {
        this.specialAbility(pointer)
      }
    })
  }

  // Movimiento con WASD/flechas
  handleMovement(): void {
    const speed = this.stats.moveSpeed
    let vx = 0
    let vy = 0
    if (this.cursor.left.isDown || this.cursor.left2.isDown) vx = -1
    else if (this.cursor.right.isDown || this.cursor.right2.isDown) vx = 1
    if (this.cursor.up.isDown || this.cursor.up2.isDown) vy = -1
    else if (this.cursor.down.isDown || this.cursor.down2.isDown) vy = 1
    if (vx !== 0 || vy !== 0) {
      const norm = Math.hypot(vx, vy) || 1
      vx = (vx / norm) * speed
      vy = (vy / norm) * speed
    }
    this.container.body.setVelocity(vx, vy)
  }

  // Ataque manual con clic izquierdo
  manualAttack(pointer: Phaser.Input.Pointer): void {
    const px = this.container.x
    const py = this.container.y
    const angle = Phaser.Math.Angle.Between(px, py, pointer.worldX, pointer.worldY)
    const proj = this.scene.add.circle(px, py, 4, 0xffaa00) as any
    this.scene.physics.add.existing(proj)
    const body = proj.body as Phaser.Physics.Arcade.Body
    const speed = 300
    body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed)
    body.setCircle(4)

    const mainScene = this.scene as any
    // Overlap con enemigos
    const overlapCollider = this.scene.physics.add.overlap(proj, mainScene.enemies, (_p, eneObj) => {
      mainScene.enemyManager.enemies.forEach((e: any) => {
        if (e.container === eneObj) {
          e.takeDamage(this.stats.baseDamage)
        }
      })
      if (proj.active) proj.destroy()
      this.scene.physics.world.removeCollider(overlapCollider)
    })
    // Destruir tras 2s si no colisiona
    this.scene.time.delayedCall(2000, () => {
      if (proj.active) proj.destroy()
      this.scene.physics.world.removeCollider(overlapCollider)
    })
  }

  // Habilidad especial: decide entre orbes y bomba según flags
  specialAbility(pointer: Phaser.Input.Pointer): void {
    const mainScene = this.scene as any
    const now = mainScene.time.now
    if (now < this.specialCooldownUntil) {
      return // en cooldown
    }
    // Prioridad: si tiene bomba, lanza bomba; si no, si tiene orbes, activa orbes
    if (this.hasBombAbility) {
      this.launchBomb(pointer)
      // cooldown de bomba, p.ej. 10s
      this.specialCooldownUntil = now + 10000
    } else if (this.hasOrbitAbility) {
      // toggle orbes
      if (!this.orbitActive) {
        this.enableOrbitOrbs()
      } else {
        this.disableOrbitOrbs()
      }
      this.specialCooldownUntil = now + 10000
    }
    // Si quieres ambas simultáneas, podrías llamar ambas aquí
  }

  // Lanzar bomba hacia puntero; explota al tocar enem o al expirar
  launchBomb(pointer: Phaser.Input.Pointer): void {
    const mainScene = this.scene as any
    const px = this.container.x
    const py = this.container.y
    const tx = pointer.worldX
    const ty = pointer.worldY
    const angle = Phaser.Math.Angle.Between(px, py, tx, ty)

    // Crear bomba tamaño aumentado (radio 8)
    const bomb = this.scene.add.circle(px, py, 8, 0xff0000) as any
    this.scene.physics.add.existing(bomb)
    const body = bomb.body as Phaser.Physics.Arcade.Body
    const speed = 200
    body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed)
    body.setCircle(8)

    // Función de explosión
    const explode = () => {
      if (!bomb.active) return
      const ex = bomb.x
      const ey = bomb.y
      bomb.destroy()
      // Visual explosión
      const radius = 80
      const g = this.scene.add.graphics()
      g.fillStyle(0xffaa00, 0.4)
      g.fillCircle(ex, ey, radius)
      this.scene.tweens.add({
        targets: g,
        alpha: 0,
        scale: { from: 1, to: 1.5 },
        duration: 300,
        onComplete: () => g.destroy(),
      })
      // Daño en área
      mainScene.enemyManager.enemies.forEach((e: any) => {
        const dx = e.container.x - ex
        const dy = e.container.y - ey
        if (dx * dx + dy * dy <= radius * radius) {
          e.takeDamage(this.stats.baseDamage * 3)
        }
      })
    }

    // Overlap para explotar al tocar un enemigo
    const overlapCollider = this.scene.physics.add.overlap(bomb, mainScene.enemies, () => {
      explode()
      this.scene.physics.world.removeCollider(overlapCollider)
    })

    // Explotar al llegar cerca de la posición objetivo
    const checkInterval = this.scene.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        if (!bomb.active) {
          checkInterval.remove()
          return
        }
        const dx = bomb.x - tx
        const dy = bomb.y - ty
        if (dx * dx + dy * dy <= 16 * 16) {
          explode()
          checkInterval.remove()
          this.scene.physics.world.removeCollider(overlapCollider)
        }
      },
    })

    // Explotar tras 2s si no ha explotado
    this.scene.time.delayedCall(2000, () => {
      if (bomb.active) {
        explode()
        checkInterval.remove()
        this.scene.physics.world.removeCollider(overlapCollider)
      }
    })
  }

  // Activa 3 orbes que orbitan y dañan enemigos
  enableOrbitOrbs(): void {
    if (this.orbitActive) return
    this.orbitActive = true
    // Ángulos iniciales equidistantes
    this.currentOrbAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]
    this.orbitRadius = 50
    // Velocidad de rotación escala con moveSpeed
    this.orbitRotationSpeed = this.baseOrbitRotationSpeed * (this.stats.moveSpeed / 100)
    this.orbitDamage = this.stats.baseDamage
    this.orbitDamageInterval = 500

    const mainScene = this.scene as any
    const px = this.container.x
    const py = this.container.y

    for (let i = 0; i < 3; i++) {
      const angle = this.currentOrbAngles[i]
      const ox = px + Math.cos(angle) * this.orbitRadius
      const oy = py + Math.sin(angle) * this.orbitRadius
      const orb = this.scene.add.circle(ox, oy, 6, 0x00ffff) as Phaser.GameObjects.Arc
      this.scene.physics.add.existing(orb)
      const body = orb.body as Phaser.Physics.Arcade.Body
      body.setCircle(6)
      body.setImmovable(true)
      this.orbitOrbs.push(orb)

      // Overlap para daño al contacto
      this.scene.physics.add.overlap(orb, mainScene.enemies, (_o, eneObj) => {
        mainScene.enemyManager.enemies.forEach((e: Enemy) => {
          if (e.container === eneObj) {
            const last = this.lastOrbDamage.get(e) || 0
            const now2 = this.scene.time.now
            if (now2 - last >= this.orbitDamageInterval) {
              e.takeDamage(this.orbitDamage)
              this.lastOrbDamage.set(e, now2)
            }
          }
        })
      })
    }
    // En update() se moverán los orbes
  }

  // Desactiva orbes y limpia estado
  disableOrbitOrbs(): void {
    if (!this.orbitActive) return
    this.orbitActive = false
    this.orbitOrbs.forEach((orb) => orb.destroy())
    this.orbitOrbs = []
    this.currentOrbAngles = []
    this.lastOrbDamage.clear()
  }

  // Actualización cada frame
  update( delta: number): void {
    const mainScene = this.scene as any
    if (mainScene.isPausedForUpgrade) return
    this.handleMovement()
    // this.applyInvulnerability(time)
    if (mainScene.hasMagnetism) {
      this.applyMagnetism()
    }
    if (this.orbitActive) {
      // Recalcular velocidad rotación si moveSpeed cambió dinámicamente
      this.orbitRotationSpeed = this.baseOrbitRotationSpeed * (this.stats.moveSpeed / 100)
      this.updateOrbs(delta)
    }
  }

  // Mover orbes según ángulos
  updateOrbs(delta: number): void {
    const px = this.container.x
    const py = this.container.y
    const deltaSec = delta / 1000
    for (let i = 0; i < this.orbitOrbs.length; i++) {
      this.currentOrbAngles[i] += this.orbitRotationSpeed * deltaSec
      this.currentOrbAngles[i] %= 2 * Math.PI
      const angle = this.currentOrbAngles[i]
      const ox = px + Math.cos(angle) * this.orbitRadius
      const oy = py + Math.sin(angle) * this.orbitRadius
      const orb = this.orbitOrbs[i]
      orb.x = ox
      orb.y = oy
    }
  }

  // Manejo de daño al jugador
  damage(dmg: number): void {
    const now = this.scene.time.now
    if (now < this.invulnerableUntil) return
    this.stats.hp -= dmg
    this.invulnerableUntil = now + 500
    this.scene.cameras.main.flash(100, 255, 0, 0)
    const mainScene = this.scene as any
    if (typeof mainScene.handleGameOver === "function") {
      if (this.stats.hp <= 0) {
        mainScene.handleGameOver()
      }
    } else {
      if (this.stats.hp <= 0) {
        this.scene.scene.restart()
      }
    }
  }

  // applyInvulnerability(time: number): void {
  //   // placeholder para efectos visuales
  // }

  applyMagnetism(): void {
    const mainScene = this.scene as any
    const px = this.container.x
    const py = this.container.y
    mainScene.xpOrbs.getChildren().forEach((orbObj: any) => {
      const orb = orbObj as Phaser.GameObjects.Container & {
        body: Phaser.Physics.Arcade.Body
      }
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
