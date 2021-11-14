import { Fragment } from "./Fragment";
import { ActiveFragment } from "./ActiveFragment";
import { FragmentType } from "./FragmentType";
import { IStaneksGift } from "./IStaneksGift";
import { IPlayer } from "../PersonObjects/IPlayer";
import { Factions } from "../Faction/Factions";
import { CalculateEffect } from "./formulas/effect";
import { CalculateCharge } from "./formulas/charge";
import { StaneksGiftEvents } from "./StaneksGiftEvents";
import { Generic_fromJSON, Generic_toJSON, Reviver } from "../utils/JSONReviver";
import { CONSTANTS } from "../Constants";
import { StanekConstants } from "./data/Constants";
import { BitNodeMultipliers } from "../BitNode/BitNodeMultipliers";
import { Player } from "../Player";
import { AugmentationNames } from "../Augmentation/data/AugmentationNames";

export class StaneksGift implements IStaneksGift {
  storedCycles = 0;
  fragments: ActiveFragment[] = [];

  baseSize(): number {
    return StanekConstants.BaseSize + BitNodeMultipliers.StaneksGiftExtraSize + Player.sourceFileLvl(13);
  }

  width(): number {
    return Math.floor(this.baseSize() / 2 + 1);
  }
  height(): number {
    return Math.floor(this.baseSize() / 2 + 0.6);
  }

  charge(rootX: number, rootY: number, threads: number): number {
    const af = this.findFragment(rootX, rootY);
    if (af === undefined) return 0;

    af.avgCharge = (af.numCharge * af.avgCharge + threads) / (af.numCharge + 1);
    af.numCharge++;

    Factions["Church of the Machine God"].playerReputation += Math.log(threads) / Math.log(2);

    return threads;
  }

  inBonus(): boolean {
    return (this.storedCycles * CONSTANTS._idleSpeed) / 1000 > 1;
  }

  process(p: IPlayer, numCycles = 1): void {
    if (!p.hasAugmentation(AugmentationNames.StaneksGift1)) return;
    this.fragments.filter((f) => f.fragment().type !== FragmentType.Booster).forEach((f) => f.cool());
    this.storedCycles += numCycles;
    this.storedCycles -= 5;
    this.storedCycles = Math.max(0, this.storedCycles);
    this.updateMults(p);
    StaneksGiftEvents.emit();
  }

  effect(fragment: ActiveFragment): number {
    // Find all the neighbooring cells
    const cells = fragment.neighboors();
    // find the neighbooring active fragments.
    const maybeFragments = cells.map((n) => this.fragmentAt(n[0], n[1]));

    // Filter out undefined with typescript "Type guard". Whatever
    let neighboors = maybeFragments.filter((v: ActiveFragment | undefined): v is ActiveFragment => !!v);

    neighboors = neighboors.filter((fragment) => fragment.fragment().type === FragmentType.Booster);
    let boost = 1;

    neighboors = neighboors.filter((v, i, s) => s.indexOf(v) === i);
    for (const neighboor of neighboors) {
      boost *= neighboor.fragment().power;
    }
    return CalculateEffect(fragment.avgCharge, fragment.numCharge, fragment.fragment().power, boost);
  }

  canPlace(worldX: number, worldY: number, rotation: number, fragment: Fragment): boolean {
    if (worldX < 0 || worldY < 0) return false;
    if (worldX + fragment.width(rotation) > this.width()) return false;
    if (worldY + fragment.height(rotation) > this.height()) return false;
    if (this.count(fragment) >= fragment.limit) return false;
    const newFrag = new ActiveFragment({ x: worldX, y: worldY, rotation: rotation, fragment: fragment });
    for (const aFrag of this.fragments) {
      if (aFrag.collide(newFrag)) return false;
    }
    return true;
  }

  place(worldX: number, worldY: number, rotation: number, fragment: Fragment): boolean {
    if (!this.canPlace(worldX, worldY, rotation, fragment)) return false;
    this.fragments.push(new ActiveFragment({ x: worldX, y: worldY, rotation: rotation, fragment: fragment }));
    return true;
  }

  findFragment(rootX: number, rootY: number): ActiveFragment | undefined {
    return this.fragments.find((f) => f.x === rootX && f.y === rootY);
  }

  fragmentAt(worldX: number, worldY: number): ActiveFragment | undefined {
    for (const aFrag of this.fragments) {
      if (aFrag.fullAt(worldX, worldY)) {
        return aFrag;
      }
    }

    return undefined;
  }

  count(fragment: Fragment): number {
    let amt = 0;
    for (const aFrag of this.fragments) {
      if (aFrag.fragment().id === fragment.id) amt++;
    }
    return amt;
  }

  deleteAt(worldX: number, worldY: number): boolean {
    for (let i = 0; i < this.fragments.length; i++) {
      if (this.fragments[i].fullAt(worldX, worldY)) {
        this.fragments.splice(i, 1);
        return true;
      }
    }

    return false;
  }

  clear(): void {
    this.fragments = [];
  }

  clearCharge(): void {
    this.fragments.forEach((f) => {
      f.avgCharge = 0;
      f.numCharge = 0;
    });
  }

  updateMults(p: IPlayer): void {
    p.reapplyAllAugmentations(true);
    p.reapplyAllSourceFiles();

    for (const aFrag of this.fragments) {
      const fragment = aFrag.fragment();

      const power = this.effect(aFrag);
      switch (fragment.type) {
        case FragmentType.HackingChance:
          p.hacking_chance_mult *= power;
          break;
        case FragmentType.HackingSpeed:
          p.hacking_speed_mult *= power;
          break;
        case FragmentType.HackingMoney:
          p.hacking_money_mult *= power;
          break;
        case FragmentType.HackingGrow:
          p.hacking_grow_mult *= power;
          break;
        case FragmentType.Hacking:
          p.hacking_mult *= power;
          p.hacking_exp_mult *= power;
          break;
        case FragmentType.Strength:
          p.strength_mult *= power;
          p.strength_exp_mult *= power;
          break;
        case FragmentType.Defense:
          p.defense_mult *= power;
          p.defense_exp_mult *= power;
          break;
        case FragmentType.Dexterity:
          p.dexterity_mult *= power;
          p.dexterity_exp_mult *= power;
          break;
        case FragmentType.Agility:
          p.agility_mult *= power;
          p.agility_exp_mult *= power;
          break;
        case FragmentType.Charisma:
          p.charisma_mult *= power;
          p.charisma_exp_mult *= power;
          break;
        case FragmentType.HacknetMoney:
          p.hacknet_node_money_mult *= power;
          break;
        case FragmentType.HacknetCost:
          p.hacknet_node_purchase_cost_mult *= power;
          p.hacknet_node_ram_cost_mult *= power;
          p.hacknet_node_core_cost_mult *= power;
          p.hacknet_node_level_cost_mult *= power;
          break;
        case FragmentType.Rep:
          p.company_rep_mult *= power;
          p.faction_rep_mult *= power;
          break;
        case FragmentType.WorkMoney:
          p.work_money_mult *= power;
          break;
        case FragmentType.Crime:
          p.crime_success_mult *= power;
          p.crime_money_mult *= power;
          break;
        case FragmentType.Bladeburner:
          p.bladeburner_max_stamina_mult *= power;
          p.bladeburner_stamina_gain_mult *= power;
          p.bladeburner_analysis_mult *= power;
          p.bladeburner_success_chance_mult *= power;
          break;
      }
    }
    p.updateSkillLevels();
  }

  prestigeAugmentation(): void {
    this.clearCharge();
  }

  prestigeSourceFile(): void {
    this.clear();
    this.storedCycles = 0;
  }

  /**
   * Serialize Staneks Gift to a JSON save state.
   */
  toJSON(): any {
    return Generic_toJSON("StaneksGift", this);
  }

  /**
   * Initializes Staneks Gift from a JSON save state
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  static fromJSON(value: any): StaneksGift {
    return Generic_fromJSON(StaneksGift, value.data);
  }
}

Reviver.constructors.StaneksGift = StaneksGift;
