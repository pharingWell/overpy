/*
 * This file is part of OverPy (https://github.com/Zezombye/overpy).
 * Copyright (c) 2019 Zezombye.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";
// @ts-check
import { customGameSettingsKw } from "./other.js";
import { gamemodeKw } from "./gamemodes.js";
import { heroKw } from "./heroes.js";
import { customGameSettingsSchematic } from "./customGameSchematic.js";

export var customGameSettingsSchema = customGameSettingsSchematic;

const availableLanguages = ["de-DE", "es-ES", "es-MX", "fr-FR", "it-IT", "ja-JP", "ko-KR", "pl-PL", "pt-BR", "ru-RU", "zh-CN", "zh-TW", "en-US"];

//Resolve guids for the max team players
for (var key of Object.keys(customGameSettingsSchema.lobby.values.team1Slots)) {
    if (availableLanguages.includes(key)) {
        customGameSettingsSchema.lobby.values.team1Slots[key] = customGameSettingsSchema.lobby.values.team1Slots[key].replace("%1$s", customGameSettingsKw["__team1__"][key] || customGameSettingsKw["__team1__"]["en-US"])
    }
}
for (var key of Object.keys(customGameSettingsSchema.lobby.values.team2Slots)) {
    if (availableLanguages.includes(key)) {
        customGameSettingsSchema.lobby.values.team2Slots[key] = customGameSettingsSchema.lobby.values.team2Slots[key].replace("%1$s", customGameSettingsKw["__team2__"][key] || customGameSettingsKw["__team2__"]["en-US"])
    }
}

//Add translations for each gamemode
for (var gamemode of Object.keys(gamemodeKw)) {
    if (!(gamemode in customGameSettingsSchema.gamemodes.values)) {
        Object.getOwnPropertyNames(customGameSettingsSchema.gamemodes.values[gamemode]).forEach((property) => {
            delete customGameSettingsSchema.gamemodes.values[gamemode][property]
        })
        customGameSettingsSchema.gamemodes.values[gamemode].values = {};
    }
    Object.assign(customGameSettingsSchema.gamemodes.values[gamemode], gamemodeKw[gamemode])
}

//Apply general settings to each gamemode... but not Elimination for some reason lmao
for (var gamemode in customGameSettingsSchema.gamemodes.values) {
    if (gamemode === "elimination") {
        for (var key of ["enabledMaps", "disabledMaps", "enableEnemyHealthBars", "gamemodeStartTrigger", "healthPackRespawnTime%", "enableKillCam", "enableKillFeed", "enableSkins", "spawnHealthPacks"]) {
            customGameSettingsSchema.gamemodes.values[gamemode].values[key] = customGameSettingsSchema.gamemodes.values.general.values[key];
        }
    } else {
        Object.assign(customGameSettingsSchema.gamemodes.values[gamemode].values, customGameSettingsSchema.gamemodes.values.general.values);
    }
}
//Can't enable/disable maps in general
delete customGameSettingsSchema.gamemodes.values.general.values.enabledMaps;
delete customGameSettingsSchema.gamemodes.values.general.values.disabledMaps;

//Apply each gamemode's settings to general settings
for (var gamemode in customGameSettingsSchema.gamemodes.values) {
    Object.assign(customGameSettingsSchema.gamemodes.values.general.values, customGameSettingsSchema.gamemodes.values[gamemode].values);
}

//Generate settings for heroes.general
customGameSettingsSchema.heroes.values["general"] = {values: {}}
customGameSettingsSchema.heroes.values["general"].values = Object.assign({},
    customGameSettingsSchema["heroes"].values["__generalAndEachHero__"],
    customGameSettingsSchema.heroes.values["__generalButNotEachHero__"])

//Generate settings for each hero
for (var hero of Object.keys(heroKw)) {

    if (!(hero in customGameSettingsSchema.heroes.values)) {
        customGameSettingsSchema.heroes.values[hero] = {};
        customGameSettingsSchema.heroes.values[hero].values = {};
    }

    var eachHero = Object.assign({}, customGameSettingsSchema.heroes.values["__generalAndEachHero__"], customGameSettingsSchema.heroes.values["__eachHero__"])

    for (var key of Object.keys(eachHero)) {
        if ("include" in eachHero[key] && eachHero[key].include.includes(hero)
                || "exclude" in eachHero[key] && !eachHero[key].exclude.includes(hero)
                || !("include" in eachHero[key]) && !("exclude" in eachHero[key])) {

            var destKey = (key === "enableGenericSecondaryFire" ? "enableSecondaryFire" : key)
            customGameSettingsSchema.heroes.values[hero].values[destKey] = JSON.parse(JSON.stringify(eachHero[key]));

            var heroValue = customGameSettingsSchema.heroes.values[hero].values[destKey];

            if ([
                "secondaryFireCooldown%", "enableSecondaryFire", "secondaryFireMaximumTime%", "secondaryFireRechargeRate%", "secondaryFireEnergyChargeRate%",
                "ability3Cooldown%", "enableAbility3",
                "ability2Cooldown%", "enableAbility2",
                "ability1Cooldown%", "enableAbility1",
                "enablePassive",
                "enableUlt", "ultGen%", "combatUltGen%", "passiveUltGen%"
            ].includes(key)) {
                for (var lang of availableLanguages) {
                    var key2 = (lang in heroValue ? lang : "en-US")

                    if (["secondaryFireCooldown%", "enableSecondaryFire", "secondaryFireMaximumTime%", "secondaryFireRechargeRate%", "secondaryFireEnergyChargeRate%"].includes(key)) {
                        heroValue[lang] = heroValue[key2].replace("%1$s", heroKw[hero]["secondaryFire"][lang] || heroKw[hero]["secondaryFire"]["en-US"])

                    } else if (["ability3Cooldown%", "enableAbility3"].includes(key)) {
                        heroValue[lang] = heroValue[key2].replace("%1$s", heroKw[hero]["ability3"][lang] || heroKw[hero]["ability3"]["en-US"])
                    } else if (["ability2Cooldown%", "enableAbility2"].includes(key)) {
                        heroValue[lang] = heroValue[key2].replace("%1$s", heroKw[hero]["ability2"][lang] || heroKw[hero]["ability2"]["en-US"])
                    } else if (["ability1Cooldown%", "enableAbility1"].includes(key)) {
                        heroValue[lang] = heroValue[key2].replace("%1$s", heroKw[hero]["ability1"][lang] || heroKw[hero]["ability1"]["en-US"])
                    } else if (["enablePassive"].includes(key)) {
                        heroValue[lang] = heroValue[key2].replace("%1$s", heroKw[hero]["passive"][lang] || heroKw[hero]["passive"]["en-US"])
                    } else if (["enableUlt", "ultGen%", "combatUltGen%", "passiveUltGen%"].includes(key)) {
                        heroValue[lang] = heroValue[key2].replace("%1$s", heroKw[hero]["ultimate"][lang] || heroKw[hero]["ultimate"]["en-US"]);
                    }
                }
            }
        }
    }
}

//Apply extension

delete customGameSettingsSchema.heroes.values["__generalAndEachHero__"]
delete customGameSettingsSchema.heroes.values["__eachHero__"]
delete customGameSettingsSchema.heroes.values["__generalButNotEachHero__"]




