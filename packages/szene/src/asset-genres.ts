// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/** Editorial catalogue tags; these do not add a new map setting or alter saved maps. */
export const ASSET_GENRES = ["fantasy", "gothic", "antike", "wuxia", "piraten", "western", "steampunk", "noir", "cyberpunk", "weltraum", "postapokalypse", "unterwasser"] as const;
export type AssetGenre = typeof ASSET_GENRES[number];
export const ASSET_GENRE_LABEL: Readonly<Record<AssetGenre, string>> = {
  fantasy: "Fantasy & Magie", gothic: "Gothic & Horror", antike: "Antike", wuxia: "Wuxia",
  piraten: "Piraten & Seefahrt", western: "Western", steampunk: "Steampunk", noir: "Noir & Krimi",
  cyberpunk: "Cyberpunk", weltraum: "Weltraum", postapokalypse: "Postapokalypse", unterwasser: "Unterwasser",
};
