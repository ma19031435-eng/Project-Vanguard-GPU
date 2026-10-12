/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, ShoppingBag, Sparkles, Shield, Palette, Crown, Check, Coins } from 'lucide-react';
import { 
  ShopSystem, 
  SHOP_SKINS, 
  SHOP_HATS, 
  WeaponSkinId, 
  CharacterHatId 
} from '../../engine/shop/ShopSystem.ts';
import { WeaponType, WEAPON_DEFINITIONS } from '../../engine/weapons/WeaponSystem.ts';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: ShopSystem;
  onSkinChanged: (skinId: WeaponSkinId) => void;
  onHatChanged: (hatId: CharacterHatId) => void;
  currentWeapon: WeaponType;
  onSelectWeapon: (weapon: WeaponType) => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  onClose,
  shop,
  onSkinChanged,
  onHatChanged,
  currentWeapon,
  onSelectWeapon
}) => {
  const [activeTab, setActiveTab] = useState<'skins' | 'hats' | 'weapons'>('skins');
  const [, setRefreshKey] = useState(0);

  if (!isOpen) return null;

  const triggerUpdate = () => setRefreshKey(k => k + 1);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 hud-font select-none">
      <div className="bg-zinc-950 border-2 border-amber-500/50 rounded-2xl w-full max-w-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-zinc-200 flex flex-col max-h-[calc(100dvh-1rem)] sm:max-h-[90dvh]">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg text-white tracking-wider">RIVALS ARMORY &amp; SHOP</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/40 uppercase">
                  INDIE EDITION
                </span>
              </div>
              <div className="text-xs text-zinc-400">Unlock blocky skins, hats, and customize your combat loadout</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Coins Balance */}
            <div className="px-4 py-2 bg-amber-950/40 border border-amber-500/50 rounded-xl flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <Coins className="w-5 h-5 text-amber-400 animate-pulse" />
              <div className="text-right">
                <div className="text-[10px] text-amber-300/80 font-bold">RIVAL COINS</div>
                <div className="text-sm font-black text-amber-300">{shop.coins.toLocaleString()} ⛁</div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 my-4 border-b border-zinc-800 pb-3 shrink-0">
          <button
            onClick={() => setActiveTab('skins')}
            className={`py-2 px-5 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
              activeTab === 'skins'
                ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Palette className="w-4 h-4" /> WEAPON SKINS
          </button>
          <button
            onClick={() => setActiveTab('hats')}
            className={`py-2 px-5 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
              activeTab === 'hats'
                ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Crown className="w-4 h-4" /> CHARACTER HATS
          </button>
          <button
            onClick={() => setActiveTab('weapons')}
            className={`py-2 px-5 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
              activeTab === 'weapons'
                ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Shield className="w-4 h-4" /> WEAPON ARSENAL
          </button>
        </div>

        {/* Content Container */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 space-y-4" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
          {/* TAB 1: WEAPON SKINS */}
          {activeTab === 'skins' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(Object.keys(SHOP_SKINS) as WeaponSkinId[]).map((id) => {
                const item = SHOP_SKINS[id];
                const isOwned = shop.ownedSkins.has(id);
                const isEquipped = shop.equippedSkin === id;
                const canAfford = shop.coins >= item.price;

                const rarityColor = 
                  item.rarity === 'Legendary' ? 'text-purple-400 border-purple-500/50' :
                  item.rarity === 'Epic' ? 'text-amber-400 border-amber-500/50' :
                  item.rarity === 'Rare' ? 'text-cyan-400 border-cyan-500/50' : 'text-zinc-400 border-zinc-700';

                return (
                  <div
                    key={id}
                    className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                      isEquipped
                        ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      {/* Top Bar with Rarity & Color Swatch */}
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${rarityColor}`}>
                          {item.rarity}
                        </span>
                        <div
                          className="w-5 h-5 rounded-full border border-white/40 shadow-sm"
                          style={{ background: `linear-gradient(135deg, ${item.colorHex}, ${item.accentHex})` }}
                        />
                      </div>

                      <div className="font-black text-sm text-white mb-1">{item.name}</div>
                      <div className="text-[11px] text-zinc-400 leading-tight mb-3">{item.description}</div>
                    </div>

                    <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                      <div className="text-xs font-bold text-amber-300">
                        {item.price === 0 ? 'FREE' : `${item.price} ⛁`}
                      </div>

                      {isEquipped ? (
                        <div className="py-1 px-3 bg-amber-500 text-black font-black text-xs rounded-lg flex items-center gap-1 shadow-[0_0_10px_#f59e0b]">
                          <Check className="w-3.5 h-3.5" /> EQUIPPED
                        </div>
                      ) : isOwned ? (
                        <button
                          onClick={() => {
                            shop.buySkin(id);
                            onSkinChanged(id);
                            triggerUpdate();
                          }}
                          className="py-1 px-3 bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/40 font-bold text-xs rounded-lg transition"
                        >
                          EQUIP
                        </button>
                      ) : (
                        <button
                          disabled={!canAfford}
                          onClick={() => {
                            if (shop.buySkin(id)) {
                              onSkinChanged(id);
                              triggerUpdate();
                            }
                          }}
                          className={`py-1 px-3 rounded-lg font-black text-xs transition ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          BUY FOR {item.price} ⛁
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: CHARACTER HATS */}
          {activeTab === 'hats' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(Object.keys(SHOP_HATS) as CharacterHatId[]).map((id) => {
                const item = SHOP_HATS[id];
                const isOwned = shop.ownedHats.has(id);
                const isEquipped = shop.equippedHat === id;
                const canAfford = shop.coins >= item.price;

                const rarityColor = 
                  item.rarity === 'Legendary' ? 'text-purple-400 border-purple-500/50' :
                  item.rarity === 'Epic' ? 'text-amber-400 border-amber-500/50' :
                  item.rarity === 'Rare' ? 'text-cyan-400 border-cyan-500/50' : 'text-zinc-400 border-zinc-700';

                return (
                  <div
                    key={id}
                    className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                      isEquipped
                        ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${rarityColor}`}>
                          {item.rarity}
                        </span>
                        <Crown className="w-4 h-4 text-amber-400" />
                      </div>

                      <div className="font-black text-sm text-white mb-1">{item.name}</div>
                      <div className="text-[11px] text-zinc-400 leading-tight mb-3">{item.description}</div>
                    </div>

                    <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                      <div className="text-xs font-bold text-amber-300">
                        {item.price === 0 ? 'FREE' : `${item.price} ⛁`}
                      </div>

                      {isEquipped ? (
                        <div className="py-1 px-3 bg-amber-500 text-black font-black text-xs rounded-lg flex items-center gap-1 shadow-[0_0_10px_#f59e0b]">
                          <Check className="w-3.5 h-3.5" /> EQUIPPED
                        </div>
                      ) : isOwned ? (
                        <button
                          onClick={() => {
                            shop.buyHat(id);
                            onHatChanged(id);
                            triggerUpdate();
                          }}
                          className="py-1 px-3 bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/40 font-bold text-xs rounded-lg transition"
                        >
                          EQUIP
                        </button>
                      ) : (
                        <button
                          disabled={!canAfford}
                          onClick={() => {
                            if (shop.buyHat(id)) {
                              onHatChanged(id);
                              triggerUpdate();
                            }
                          }}
                          className={`py-1 px-3 rounded-lg font-black text-xs transition ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          BUY FOR {item.price} ⛁
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: WEAPONS ARSENAL */}
          {activeTab === 'weapons' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(WEAPON_DEFINITIONS) as WeaponType[]).map((wId) => {
                const wDef = WEAPON_DEFINITIONS[wId];
                const isSelected = currentWeapon === wId;

                return (
                  <div
                    key={wId}
                    className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-black text-sm text-white">{wDef.name}</span>
                        <span className="text-[10px] text-amber-400 font-bold uppercase">{wDef.category}</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mb-3">
                        Damage: <span className="text-white font-bold">{wDef.damage}</span> | Fire Rate: <span className="text-white font-bold">{wDef.fireRateRpm} RPM</span> | Mag: <span className="text-white font-bold">{wDef.magazineSize}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                      <span className="text-[10px] text-zinc-500">HOTKEY [{wId === 'rifle' ? '1' : wId === 'railgun' ? '2' : wId === 'shotgun' ? '3' : wId === 'pistol' ? '4' : wId === 'melee' ? '5' : '6'}]</span>
                      <button
                        onClick={() => {
                          onSelectWeapon(wId);
                          triggerUpdate();
                        }}
                        className={`py-1.5 px-4 rounded-lg font-black text-xs transition ${
                          isSelected
                            ? 'bg-amber-500 text-black shadow-[0_0_12px_#f59e0b]'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                        }`}
                      >
                        {isSelected ? 'ACTIVE WEAPON' : 'EQUIP NOW'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-between items-center text-[11px] text-zinc-400 shrink-0">
          <div>Tip: Press <span className="text-amber-400 font-bold">[B]</span> anytime in match to open the Armory &amp; Shop.</div>
          <button
            onClick={onClose}
            className="py-2 px-6 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl transition shadow-[0_0_15px_rgba(245,158,11,0.3)]"
          >
            RETURN TO BATTLE
          </button>
        </div>
      </div>
    </div>
  );
};
