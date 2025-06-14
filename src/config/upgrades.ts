export interface UpgradeOption {
  id: string
  label: string
  apply: () => void
}

export function getAllUpgrades(scene: any): UpgradeOption[] {
  return [
    {
      id: "increaseDamage",
      label: "Aumentar daño base",
      apply: () => {
        scene.player.stats.baseDamage += 5
      },
    },
    {
      id: "fasterAttack",
      label: "Aumentar velocidad de ataque",
      apply: () => {
        scene.player.stats.attackRate = Math.max(100, scene.player.stats.attackRate * 0.9)
        scene.player.initAutoAttack()
      },
    },
    {
      id: "increaseRange",
      label: "Aumentar rango de ataque",
      apply: () => {
        scene.player.stats.attackRange += 20
      },
    },
    {
      id: "moreHp",
      label: "Aumentar vida máxima",
      apply: () => {
        scene.player.stats.maxHp += 20
        scene.player.stats.hp += 20
      },
    },
    {
      id: "moveFaster",
      label: "Aumentar velocidad de movimiento",
      apply: () => {
        scene.player.stats.moveSpeed += 20
      },
    },
    {
      id: "magnetism",
      label: "Magnetismo de XP",
      apply: () => {
        scene.hasMagnetism = true
        scene.magnetRadius = 100
      },
    },
  ]
}
