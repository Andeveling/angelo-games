import Phaser from "phaser"
import MainScene from "./scenes/MainScene"

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#1d1d1d",
  physics: {
    default: "arcade",
    arcade: { debug: false },
  },
  scene: [MainScene],
  parent: "game-container",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
}

window.addEventListener("load", () => {
  new Phaser.Game(config)
})
