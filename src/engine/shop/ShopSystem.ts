/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type WeaponSkinId = 'default' | 'neon' | 'gold' | 'dragon' | 'void' | 'arctic';
export type CharacterHatId = 'none' | 'helmet' | 'visor' | 'crown' | 'ninja';

export interface ShopItemDef {
  id: string;
  name: string;
  category: 'skin' | 'hat' | 'weapon';
  price: number;
  description: string;
  colorHex: string;
  accentHex: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
}

export const SHOP_SKINS: Record<WeaponSkinId, ShopItemDef> = {
  default: {
    id: 'default',
    name: 'Standard Issue',
    category: 'skin',
    price: 0,
    description: 'Factory-standard matte tactical finish.',
    colorHex: '#272a30',
    accentHex: '#737a85',
    rarity: 'Common'
  },
  neon: {
    id: 'neon',
    name: 'Neon Cyberwave',
    category: 'skin',
    price: 250,
    description: 'Electrified cyan and hot magenta neon glow.',
    colorHex: '#00e5ff',
    accentHex: '#ff007f',
    rarity: 'Rare'
  },
  gold: {
    id: 'gold',
    name: 'Golden Elite',
    category: 'skin',
    price: 500,
    description: 'Polished 24-karat mirror gold coating.',
    colorHex: '#ffd700',
    accentHex: '#b8860b',
    rarity: 'Epic'
  },
  dragon: {
    id: 'dragon',
    name: 'Dragonfire Crimson',
    category: 'skin',
    price: 750,
    description: 'Blazing dragon scale crimson and molten orange.',
    colorHex: '#ff2200',
    accentHex: '#ff8800',
    rarity: 'Epic'
  },
  void: {
    id: 'void',
    name: 'Void Nebula',
    category: 'skin',
    price: 1000,
    description: 'Deep cosmic dark matter infused with star dust.',
    colorHex: '#8a2be2',
    accentHex: '#4b0082',
    rarity: 'Legendary'
  },
  arctic: {
    id: 'arctic',
    name: 'Arctic Camo',
    category: 'skin',
    price: 350,
    description: 'Sub-zero frost white and glacial blue camouflage.',
    colorHex: '#e0f7fa',
    accentHex: '#00bcd4',
    rarity: 'Rare'
  }
};

export const SHOP_HATS: Record<CharacterHatId, ShopItemDef> = {
  none: {
    id: 'none',
    name: 'Standard Bare',
    category: 'hat',
    price: 0,
    description: 'Standard tactical hair/headset.',
    colorHex: '#333333',
    accentHex: '#555555',
    rarity: 'Common'
  },
  helmet: {
    id: 'helmet',
    name: 'Kevlar SWAT Helmet',
    category: 'hat',
    price: 200,
    description: 'High-impact ballistic helmet with NVG mount.',
    colorHex: '#1e242b',
    accentHex: '#3a4452',
    rarity: 'Common'
  },
  visor: {
    id: 'visor',
    name: 'Cyber HUD Visor',
    category: 'hat',
    price: 400,
    description: 'Holographic tactical tactical targeting visor.',
    colorHex: '#00ffff',
    accentHex: '#0088cc',
    rarity: 'Rare'
  },
  ninja: {
    id: 'ninja',
    name: 'Shinobi Oni Mask',
    category: 'hat',
    price: 600,
    description: 'Traditional Japanese demon assassin mask.',
    colorHex: '#cc1111',
    accentHex: '#ffffff',
    rarity: 'Epic'
  },
  crown: {
    id: 'crown',
    name: 'Champion Crown',
    category: 'hat',
    price: 1200,
    description: 'The golden crown awarded only to Rivals champions.',
    colorHex: '#ffd700',
    accentHex: '#ff1493',
    rarity: 'Legendary'
  }
};

const STORAGE_KEY = 'vanguard_rivals_shop_save_v1';

export class ShopSystem {
  public coins: number = 350; // Starter coins
  public ownedSkins: Set<WeaponSkinId> = new Set(['default']);
  public ownedHats: Set<CharacterHatId> = new Set(['none']);
  public equippedSkin: WeaponSkinId = 'default';
  public equippedHat: CharacterHatId = 'none';

  constructor() {
    this.loadFromStorage();
  }

  public loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.coins === 'number') this.coins = parsed.coins;
        if (Array.isArray(parsed.ownedSkins)) this.ownedSkins = new Set(parsed.ownedSkins);
        if (Array.isArray(parsed.ownedHats)) this.ownedHats = new Set(parsed.ownedHats);
        if (parsed.equippedSkin) this.equippedSkin = parsed.equippedSkin;
        if (parsed.equippedHat) this.equippedHat = parsed.equippedHat;
      }
    } catch {
      // Fallback
    }
  }

  public saveToStorage(): void {
    try {
      const data = {
        coins: this.coins,
        ownedSkins: Array.from(this.ownedSkins),
        ownedHats: Array.from(this.ownedHats),
        equippedSkin: this.equippedSkin,
        equippedHat: this.equippedHat
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Fallback
    }
  }

  public addCoins(amount: number): number {
    this.coins += amount;
    this.saveToStorage();
    return this.coins;
  }

  public buySkin(skinId: WeaponSkinId): boolean {
    const def = SHOP_SKINS[skinId];
    if (!def) return false;
    if (this.ownedSkins.has(skinId)) {
      this.equippedSkin = skinId;
      this.saveToStorage();
      return true;
    }
    if (this.coins >= def.price) {
      this.coins -= def.price;
      this.ownedSkins.add(skinId);
      this.equippedSkin = skinId;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  public buyHat(hatId: CharacterHatId): boolean {
    const def = SHOP_HATS[hatId];
    if (!def) return false;
    if (this.ownedHats.has(hatId)) {
      this.equippedHat = hatId;
      this.saveToStorage();
      return true;
    }
    if (this.coins >= def.price) {
      this.coins -= def.price;
      this.ownedHats.add(hatId);
      this.equippedHat = hatId;
      this.saveToStorage();
      return true;
    }
    return false;
  }
}
