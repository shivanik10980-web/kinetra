'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MangaCard } from '@/components/system/MangaCard';
import { AvatarViewer } from '@/components/avatar/AvatarViewer';
import { defaultStorage } from '@/lib/storage/indexeddb';
import {
  AvatarCustomization,
  AvatarProgression,
  FacePresetId,
  HairstyleId,
  OutfitId,
  DEFAULT_AVATAR_CUSTOMIZATION,
  DEFAULT_AVATAR_PROGRESSION,
} from '@/lib/avatar/types';
import { ArrowLeft, Save, Check, Sparkles, User } from 'lucide-react';

const FACE_PRESETS: { id: FacePresetId; label: string; desc: string }[] = [
  { id: 'stoic', label: 'Stoic Guardian', desc: 'Calm, focused, unyielding discipline' },
  { id: 'sharp', label: 'Sharp Pathfinder', desc: 'Alert, agile, kinetic contours' },
  { id: 'fierce', label: 'Fierce Challenger', desc: 'Passionate, bold determination' },
  { id: 'round', label: 'Harmonious Guide', desc: 'Balanced, approachable, mindful' },
];

const SKIN_TONES = [
  { hex: '#FBD3B6', label: 'Fair Warm' },
  { hex: '#E0AC69', label: 'Golden Olive' },
  { hex: '#C68642', label: 'Rich Honey' },
  { hex: '#8D5524', label: 'Deep Amber' },
  { hex: '#58361B', label: 'Ebony Earth' },
];

const HAIR_COLORS = [
  { hex: '#1A1817', label: 'Raven Ink' },
  { hex: '#4A2E18', label: 'Chestnut' },
  { hex: '#CBD5E1', label: 'Silver Ash' },
  { hex: '#DC2626', label: 'Crimson Ember' },
  { hex: '#0284C7', label: 'Azure Sky' },
];

const EYE_COLORS = [
  { hex: '#2563EB', label: 'Cobalt' },
  { hex: '#059669', label: 'Emerald' },
  { hex: '#D97706', label: 'Amber' },
  { hex: '#7C3AED', label: 'Amethyst' },
  { hex: '#1E293B', label: 'Obsidian' },
];

const HAIRSTYLES: { id: HairstyleId; label: string }[] = [
  { id: 'wild', label: 'Manga Spiky' },
  { id: 'short', label: 'Clean Crop' },
  { id: 'ponytail', label: 'Ronin Ponytail' },
  { id: 'flowing', label: 'Flowing Waves' },
  { id: 'buzz', label: 'Disciplined Buzz' },
];

const OUTFITS: { id: OutfitId; label: string; desc: string }[] = [
  { id: 'gi', label: 'Dojo Gi', desc: 'Traditional martial movement uniform' },
  { id: 'training_tunic', label: 'Nomad Tunic', desc: 'Breathable layered linen tunic' },
  { id: 'ronin_vest', label: 'Ronin Vest', desc: 'Sleeveless movement armor vest' },
  { id: 'compression_armor', label: 'Kinetic Armor', desc: 'Sleek ergonomic tactical suit' },
];

export default function AvatarCreatorPage() {
  const router = useRouter();
  const [customization, setCustomization] = useState<AvatarCustomization>(
    DEFAULT_AVATAR_CUSTOMIZATION
  );
  const [progression, setProgression] = useState<AvatarProgression>(
    DEFAULT_AVATAR_PROGRESSION
  );
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'identity' | 'hair' | 'body' | 'outfit'>('identity');

  useEffect(() => {
    defaultStorage.getAvatar().then((data) => {
      if (data?.customization) setCustomization(data.customization);
      if (data?.progression) setProgression(data.progression);
    });
  }, []);

  const handleSave = async () => {
    await defaultStorage.saveAvatar({
      customization,
      progression,
    });
    setIsSaved(true);
    setTimeout(() => {
      router.push('/avatar');
    }, 800);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Navigation Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          href="/avatar"
          className="touch-target inline-flex items-center gap-2 px-3 py-1.5 border-2 border-[var(--border-color)] bg-[var(--surface-panel)] text-xs font-bold uppercase hover:bg-[var(--paper)]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Character</span>
        </Link>
        <button
          type="button"
          onClick={handleSave}
          className="touch-target px-5 py-2 bg-[var(--cyan)] text-[var(--ink)] font-black uppercase text-sm border-2 border-[var(--border-color)] shadow-[3px_3px_0px_var(--border-color)] hover:translate-x-[-1px] hover:translate-y-[-1px] flex items-center gap-2"
        >
          {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{isSaved ? 'Identity Saved!' : 'Save Character'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 3D Model Real-Time Preview */}
        <div className="lg:col-span-5">
          <MangaCard title="Live Character Likeness" badge="3D VIEWER">
            <AvatarViewer
              customization={customization}
              progression={progression}
              className="w-full h-[420px]"
            />
            <p className="text-[11px] text-[var(--text-secondary)] mt-3 text-center">
              Identity parameters are permanent character foundations. They carry seamlessly
              across all stages of evolution.
            </p>
          </MangaCard>
        </div>

        {/* Customization Controls */}
        <div className="lg:col-span-7">
          <MangaCard title="Customise Identity & Attire" badge="CREATOR STUDIO">
            {/* Tabs */}
            <div className="flex items-center gap-2 border-b-2 border-[var(--border-color)] pb-3 mb-6 overflow-x-auto">
              {(
                [
                  { id: 'identity', label: 'Face & Name' },
                  { id: 'hair', label: 'Hair & Eyes' },
                  { id: 'body', label: 'Base Frame' },
                  { id: 'outfit', label: 'Wardrobe' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`touch-target px-4 py-1.5 text-xs font-black uppercase tracking-wider border-2 transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[var(--cyan)] text-[var(--ink)] border-[var(--border-color)] shadow-[2px_2px_0px_var(--border-color)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Face & Identity */}
            {activeTab === 'identity' && (
              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="char-name"
                    className="block text-xs font-black uppercase text-[var(--text-secondary)] mb-2"
                  >
                    Character Name
                  </label>
                  <input
                    id="char-name"
                    type="text"
                    value={customization.characterName}
                    maxLength={24}
                    onChange={(e) =>
                      setCustomization((prev) => ({ ...prev, characterName: e.target.value }))
                    }
                    className="w-full p-3 border-2 border-[var(--border-color)] bg-[var(--surface-inset)] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cyan)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-[var(--text-secondary)] mb-2">
                    Face Archetype Preset
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {FACE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          setCustomization((prev) => ({ ...prev, facePreset: preset.id }))
                        }
                        className={`p-3 text-left border-2 transition-all ${
                          customization.facePreset === preset.id
                            ? 'bg-[var(--surface-inset)] border-[var(--cyan)] shadow-[2px_2px_0px_var(--cyan)]'
                            : 'border-[var(--border-color)] bg-[var(--surface-panel)] hover:bg-[var(--paper)]'
                        }`}
                      >
                        <div className="font-extrabold text-sm">{preset.label}</div>
                        <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          {preset.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-[var(--text-secondary)] mb-2">
                    Skin Complexion
                  </label>
                  <div className="flex items-center gap-3 flex-wrap">
                    {SKIN_TONES.map((tone) => (
                      <button
                        key={tone.hex}
                        type="button"
                        onClick={() =>
                          setCustomization((prev) => ({ ...prev, skinTone: tone.hex }))
                        }
                        title={tone.label}
                        aria-label={`Select ${tone.label} skin tone`}
                        className={`w-10 h-10 rounded-full border-3 transition-transform ${
                          customization.skinTone === tone.hex
                            ? 'border-[var(--border-color)] scale-110 shadow-[0_0_0_2px_var(--cyan)]'
                            : 'border-white/50 hover:scale-105'
                        }`}
                        style={{ backgroundColor: tone.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Hair & Eyes */}
            {activeTab === 'hair' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase text-[var(--text-secondary)] mb-2">
                    Hairstyle Cut
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {HAIRSTYLES.map((hair) => (
                      <button
                        key={hair.id}
                        type="button"
                        onClick={() =>
                          setCustomization((prev) => ({ ...prev, hairstyle: hair.id }))
                        }
                        className={`p-2.5 text-center text-xs font-bold border-2 transition-all ${
                          customization.hairstyle === hair.id
                            ? 'bg-[var(--cyan)] text-[var(--ink)] border-[var(--border-color)] shadow-[2px_2px_0px_var(--border-color)]'
                            : 'border-[var(--border-color)] bg-[var(--surface-panel)] hover:bg-[var(--paper)]'
                        }`}
                      >
                        {hair.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-[var(--text-secondary)] mb-2">
                    Hair Pigment
                  </label>
                  <div className="flex items-center gap-3 flex-wrap">
                    {HAIR_COLORS.map((color) => (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() =>
                          setCustomization((prev) => ({ ...prev, hairColor: color.hex }))
                        }
                        title={color.label}
                        aria-label={`Select ${color.label} hair color`}
                        className={`w-10 h-10 rounded-full border-3 transition-transform ${
                          customization.hairColor === color.hex
                            ? 'border-[var(--border-color)] scale-110 shadow-[0_0_0_2px_var(--cyan)]'
                            : 'border-white/50 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.hex }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-[var(--text-secondary)] mb-2">
                    Iris Hue
                  </label>
                  <div className="flex items-center gap-3 flex-wrap">
                    {EYE_COLORS.map((color) => (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() =>
                          setCustomization((prev) => ({ ...prev, eyeColor: color.hex }))
                        }
                        title={color.label}
                        aria-label={`Select ${color.label} eye color`}
                        className={`w-10 h-10 rounded-full border-3 transition-transform ${
                          customization.eyeColor === color.hex
                            ? 'border-[var(--border-color)] scale-110 shadow-[0_0_0_2px_var(--cyan)]'
                            : 'border-white/50 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Base Frame Proportions */}
            {activeTab === 'body' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="height-scale"
                      className="text-xs font-black uppercase text-[var(--text-secondary)]"
                    >
                      Base Height Stature
                    </label>
                    <span className="text-xs font-mono font-bold">
                      {Math.round(customization.heightScale * 100)}%
                    </span>
                  </div>
                  <input
                    id="height-scale"
                    type="range"
                    min="0.9"
                    max="1.1"
                    step="0.02"
                    value={customization.heightScale}
                    onChange={(e) =>
                      setCustomization((prev) => ({
                        ...prev,
                        heightScale: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-[var(--cyan)] cursor-pointer"
                  />
                  <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                    Frame stature is distinct from muscular development.
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="shoulder-scale"
                      className="text-xs font-black uppercase text-[var(--text-secondary)]"
                    >
                      Base Shoulder Frame Width
                    </label>
                    <span className="text-xs font-mono font-bold">
                      {Math.round(customization.shoulderWidthScale * 100)}%
                    </span>
                  </div>
                  <input
                    id="shoulder-scale"
                    type="range"
                    min="0.9"
                    max="1.1"
                    step="0.02"
                    value={customization.shoulderWidthScale}
                    onChange={(e) =>
                      setCustomization((prev) => ({
                        ...prev,
                        shoulderWidthScale: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-[var(--cyan)] cursor-pointer"
                  />
                  <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                    Defines structural clavicle width.
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Wardrobe & Clothing */}
            {activeTab === 'outfit' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase text-[var(--text-secondary)] mb-2">
                    Movement Attire
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {OUTFITS.map((outfit) => (
                      <button
                        key={outfit.id}
                        type="button"
                        onClick={() =>
                          setCustomization((prev) => ({ ...prev, outfit: outfit.id }))
                        }
                        className={`p-3 text-left border-2 transition-all ${
                          customization.outfit === outfit.id
                            ? 'bg-[var(--surface-inset)] border-[var(--cyan)] shadow-[2px_2px_0px_var(--cyan)]'
                            : 'border-[var(--border-color)] bg-[var(--surface-panel)] hover:bg-[var(--paper)]'
                        }`}
                      >
                        <div className="font-extrabold text-sm">{outfit.label}</div>
                        <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          {outfit.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-[var(--text-secondary)] mb-2">
                    Fabric Dye Accents
                  </label>
                  <div className="flex items-center gap-3 flex-wrap">
                    {[
                      { hex: '#0EA5E9', label: 'Sky Cyan' },
                      { hex: '#6366F1', label: 'Indigo Night' },
                      { hex: '#10B981', label: 'Emerald Forest' },
                      { hex: '#F59E0B', label: 'Solar Amber' },
                      { hex: '#EF4444', label: 'Crimson Fury' },
                      { hex: '#334155', label: 'Slate Shadow' },
                    ].map((color) => (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() =>
                          setCustomization((prev) => ({ ...prev, clothingColor: color.hex }))
                        }
                        title={color.label}
                        aria-label={`Select ${color.label} clothing color`}
                        className={`w-10 h-10 rounded-full border-3 transition-transform ${
                          customization.clothingColor === color.hex
                            ? 'border-[var(--border-color)] scale-110 shadow-[0_0_0_2px_var(--cyan)]'
                            : 'border-white/50 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </MangaCard>
        </div>
      </div>
    </div>
  );
}
