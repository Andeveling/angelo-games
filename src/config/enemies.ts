export interface EnemyType {
  id: string
  hp: number
  speed: number
  xp: number
  color: number
  shape: "bat" | "skeleton" | "zombie" | string
  contactDamage?: number
  deathRadius?: number
}

export const EnemyTypes: EnemyType[] = [
  {
    id: "zombie",
    hp: 20,
    speed: 30,
    xp: 1,
    color: 0x888888,
    shape: "zombie",
    contactDamage: 10,
    deathRadius: 16,
  },
  {
    id: "bat",
    hp: 10,
    speed: 80,
    xp: 1,
    color: 0x4444ff,
    shape: "bat",
    contactDamage: 5,
    deathRadius: 12,
  },
  {
    id: "skeleton",
    hp: 30,
    speed: 40,
    xp: 2,
    color: 0xffffff,
    shape: "skeleton",
    contactDamage: 15,
    deathRadius: 18,
  },
]
