// ============================================================================
// Arcanum & Machina — Раздельное развитие Магов и Техников, Магические Дирижабли и 5 Островов
// Minecraft 1.21.1 (NeoForge) · KubeJS 2101.7.2 + Arcanum UI Mod (Rhino-safe var syntax)
// ============================================================================

var MCBlockPos = Java.loadClass('net.minecraft.core.BlockPos');
var MCHeightmapTypes = Java.loadClass('net.minecraft.world.level.levelgen.Heightmap$Types');
var MCBlocks = Java.loadClass('net.minecraft.world.level.block.Blocks');
var MCBuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries');
var MCDataComponents = null;
try {
  MCDataComponents = Java.loadClass('net.minecraft.core.component.DataComponents');
} catch (e) {
  MCDataComponents = null;
}

var ArcanumUiMod = null;
try {
  ArcanumUiMod = Java.loadClass('com.arcanum.ui.ArcanumUiMod');
} catch (e) {
  ArcanumUiMod = null;
}

var CuriosApi = null;
try {
  CuriosApi = Java.loadClass('top.theillusivec4.curios.api.CuriosApi');
} catch (e) {
  CuriosApi = null;
}

// ---------- 1. РАЗДЕЛЕНИЕ МОДОВ ПО ФРАКЦИЯМ ----------

var MAGE_MODS = {
  ars_nouveau: true,
  ars_elemental: true,
  ars_zero: true,
  sauce: true,
  nuggets: true,
  irons_spellbooks: true,
  irons_lib: true,
  hexcasting: true,
  hexal: true,
  moreiotas: true,
  paucal: true,
  naturesaura: true,
  occultism: true,
  modonomicon: true,
  thaumaturge: true,
  cognition: true,
  gateways: true,
  elementalmaces: true,
  epicpowerbracelets: true,
  rpg_potions: true,
  potion_blending: true,
  disenchanting_table: true
};

var TECH_MODS = {
  create: true,
  aeronautics: true,
  aeronautics_bundled: true,
  simulated: true,
  offroad: true,
  aeroworks: true,
  aeronauticscovers: true,
  aerocali: true,
  aeroclaims: true,
  aeronautics_dyeable_components: true,
  aeronautics_utility_objects: true,
  create_aeronautics_automated_logistics: true,
  create_aeronautics_throwable_rope_connector: true,
  create_aeronautics_toolgun: true,
  create_aeronautics_transmission_linkage: true,
  createaddition: true,
  createbigcannons: true,
  createdieselgenerators: true,
  create_diesel_skyislands: true,
  create_dragons_plus: true,
  create_enchantment_industry: true,
  createoreexcavation: true,
  createpropulsion: true,
  create_hypertube: true,
  create_power_loader: true,
  create_submarine: true,
  create_abyss: true,
  create_high_seas: true,
  creatingspace: true,
  cyberspace: true,
  escalated: true,
  interiors: true,
  sliceanddice: true,
  trading_floor: true,
  copycats: true,
  powergrid: true,
  tfmg: true,
  createthrusters: true,
  createthrusters_bundled: true,
  gadgetsngizmos: true,
  portable_engine_liquid_fuel: true,
  towed: true,
  climbable_ropes: true,
  shellbound_for_airship: true,
  modern_industrialization: true,
  moderndynamics: true,
  powah: true,
  fluxnetworks: true,
  charginggadgets: true,
  wirelesschargers: true,
  quarryplus: true,
  securitycraft: true
};

// Природные руды/камни/слитки — общие для всего мира
var NEUTRAL_WORLDGEN_PATTERNS = [
  /^create:(limestone|asurine|crimsite|ochrum|veridium|scoria|scorchia|cut_|polished_cut_|layered_|small_.*_brick)/,
  /^(create|modern_industrialization|tfmg|creatingspace|occultism|powah|createpropulsion):(deepslate_)?(zinc|tin|silver|lead|nickel|aluminum|bauxite|uranium|uraninite|cobalt|platinum|tungsten|titanium|iridium|antimony|salt|sulfur|lignite_coal|quartz)_ore$/,
  /^(create|modern_industrialization|tfmg|creatingspace|occultism|powah|createpropulsion):raw_(zinc|tin|silver|lead|nickel|aluminum|bauxite|uranium|uraninite|cobalt|platinum|tungsten|titanium|iridium|antimony)$/,
  /^(create|modern_industrialization|tfmg|creatingspace|occultism|createpropulsion):(zinc|tin|silver|lead|nickel|aluminum|uranium|cobalt|platinum|tungsten|titanium|iridium|antimony|bronze|steel|electrum|invar|cupronickel)_(ingot|nugget|dust|block|raw_storage_block)$/,
  /^(modern_industrialization|tfmg):(salt|sulfur|lignite_coal)(_dust|_block|_crushed_dust)?$/
];

// Ядро кораблестроения для Магических и Инженерных дирижаблей:
// Маги строят левитирующие корабли на кристаллах Левитита, баллонах из цветомага и арканных ускорителях (без валов и шестерён Create).
// Пропеллеры, паровые клапаны, жидкие/ионные двигатели и колёса остаются строго у Техников.
var SHARED_AIRSHIP_PATTERNS = [
  /^simulated:(physics_assembler|honey_glue|merging_glue|steering_wheel|throttle_lever|navigation_table|contraption_diagram|rope_connector|rope_coupling|docking_connector|paired_docking_connector|altitude_sensor|velocity_sensor|gimbal_sensor|linked_typewriter|directional_linked_receiver|modulating_linked_receiver)$/,
  /^simulated:[a-z_]+_(handle|nameplate|symmetric_sail)$/,
  /^aeronautics:(levitite|pearlescent_levitite|end_stone_powder|adjustable_burner)$/,
  /^aeronautics:(white|orange|magenta|light_blue|yellow|lime|pink|gray|light_gray|cyan|purple|blue|brown|green|red|black)_envelope$/,
  /^createpropulsion:(solid_fuel_thruster|solid_burner|wing|tempered_wing|copycat_wing|copycat_wing_8|copycat_wing_12|assembler_stick|assembly_gauge)$/
];

var VALID_FACTION_ISLANDS = {
  mage1: true,
  mage2: true,
  tech1: true,
  tech2: true
};

function isSharedAirshipItem(itemId) {
  for (var i = 0; i < SHARED_AIRSHIP_PATTERNS.length; i++) {
    if (SHARED_AIRSHIP_PATTERNS[i].test(itemId)) return true;
  }
  return false;
}

function isNeutralWorldgenItem(itemId) {
  for (var i = 0; i < NEUTRAL_WORLDGEN_PATTERNS.length; i++) {
    if (NEUTRAL_WORLDGEN_PATTERNS[i].test(itemId)) return true;
  }
  return isSharedAirshipItem(itemId);
}

function getItemIdFaction(rawId) {
  var itemId = '' + rawId;
  if (!itemId || itemId === 'minecraft:air') return null;
  var colon = itemId.indexOf(':');
  if (colon <= 0) return null;
  var ns = itemId.substring(0, colon);
  if (!MAGE_MODS[ns] && !TECH_MODS[ns]) return null;
  if (isNeutralWorldgenItem(itemId)) return null;
  if (MAGE_MODS[ns]) return 'mage';
  if (TECH_MODS[ns]) return 'tech';
  return null;
}

function getStackFaction(stack) {
  if (!stack || stack.isEmpty()) return null;
  return getItemIdFaction('' + stack.id);
}

function getPlayerFaction(player) {
  if (!player) return 'none';
  if (player.stages.has('faction_mage')) return 'mage';
  if (player.stages.has('faction_tech')) return 'tech';
  return 'none';
}

function isSelectorStar(stack) {
  if (!stack || stack.isEmpty()) return false;
  if (('' + stack.id) !== 'minecraft:nether_star') return false;
  try {
    if (MCDataComponents && (stack.has(MCDataComponents.CUSTOM_NAME) || stack.has(MCDataComponents.LORE))) {
      return true;
    }
  } catch (e) {}
  try {
    var hover = '' + stack.getHoverName().getString();
    return hover.indexOf('Выбор') !== -1 || hover.indexOf('Пути') !== -1 || hover.indexOf('✦') !== -1;
  } catch (e2) {
    return false;
  }
}

function makeSelectorStar() {
  var star = Item.of('minecraft:nether_star', 1);
  star = star.withCustomName(Text.of('§b§l✦ Выбор Пути и Острова ⚙').italic(false));
  star = star.withLore([
    Text.of('§7Нажмите §eПКМ§7 (или клавишу §eH§7), чтобы открыть').italic(false),
    Text.of('§7полноэкранное меню выбора Мага или Техника и Острова.').italic(false)
  ]);
  return star;
}

function giveSelectorStarIfMissing(player) {
  if (!player || getPlayerFaction(player) !== 'none') return;
  var inv = player.getInventory();
  var size = inv.getContainerSize();
  for (var i = 0; i < size; i++) {
    if (isSelectorStar(inv.getItem(i))) return;
  }
  var slot8 = inv.getItem(8);
  if (!slot8 || slot8.isEmpty()) {
    inv.setItem(8, makeSelectorStar());
  } else {
    player.give(makeSelectorStar());
  }
  try { player.inventoryMenu.broadcastFullState(); } catch (e) {}
}

function removeSelectorStars(player) {
  if (!player) return;
  var removed = false;
  var inv = player.getInventory();
  var size = inv.getContainerSize();
  for (var i = 0; i < size; i++) {
    var st = inv.getItem(i);
    if (isSelectorStar(st)) {
      st.setCount(0);
      try { inv.removeItemNoUpdate(i); } catch (e) {}
      removed = true;
    }
  }
  if (player.containerMenu) {
    var carried = player.containerMenu.getCarried();
    if (isSelectorStar(carried)) {
      carried.setCount(0);
      removed = true;
    }
  }
  try {
    player.server.runCommandSilent('clear ' + player.username + ' minecraft:nether_star[minecraft:custom_name]');
    player.server.runCommandSilent('clear ' + player.username + ' minecraft:nether_star[minecraft:lore]');
  } catch (e2) {}
  if (removed) {
    try { player.inventoryMenu.broadcastFullState(); } catch (e3) {}
  }
}

function isForbiddenForPlayer(player, stack) {
  if (!player || !stack || stack.isEmpty()) return false;
  if ((player.isCreative() || player.isSpectator()) && !player.stages.has('enforce_in_creative')) return false;
  var itemFaction = getStackFaction(stack);
  if (!itemFaction) return false;
  var playerFaction = getPlayerFaction(player);
  if (playerFaction === 'none') return true;
  return playerFaction !== itemFaction;
}

// ---------- 2. ВЫБРОС ЧУЖИХ ПРЕДМЕТОВ ИЗ ИНВЕНТАРЯ ----------

var lastWarnTick = {};

function notifyEjection(player, itemFaction, playerFaction) {
  var uuid = '' + player.uuid;
  var now = Date.now();
  var prev = lastWarnTick[uuid] || 0;
  if (now - prev < 1800) return;
  lastWarnTick[uuid] = now;

  if (playerFaction === 'none') {
    player.setStatusMessage(Text.of('§e⚖ Сначала выберите сторону (клавиша H или ПКМ звездой), чтобы держать фракционные предметы!'));
  } else if (playerFaction === 'mage') {
    player.setStatusMessage(Text.of('§d✦ Магическая аура отвергает механизмы Техников! Предмет выпал из инвентаря.'));
  } else {
    player.setStatusMessage(Text.of('§6⚙ Артефакт Магов нестабилен в руках Техника! Предмет выпал из инвентаря.'));
  }
  player.server.runCommandSilent('playsound minecraft:entity.item.break master ' + player.username + ' ~ ~ ~ 0.45 1.35');
}

function dropStackSafely(player, stack) {
  var copy = stack.copy();
  var ent = player.drop(copy, false);
  if (ent) {
    ent.setPickUpDelay(60);
  }
}

function sweepPlayerInventory(player) {
  if (!player || !player.isAlive()) return;
  var playerFaction = getPlayerFaction(player);

  // Всегда убираем звезду выбора, если сторона уже выбрана (включая Creative!)
  if (playerFaction !== 'none') {
    removeSelectorStars(player);
  }

  if ((player.isCreative() || player.isSpectator()) && !player.stages.has('enforce_in_creative')) return;

  var ejectedFaction = null;
  var changed = false;

  var inv = player.getInventory();
  var size = inv.getContainerSize();
  for (var i = 0; i < size; i++) {
    var stack = inv.getItem(i);
    if (!stack || stack.isEmpty()) continue;
    var itemFaction = getStackFaction(stack);
    if (!itemFaction) continue;
    if (playerFaction === 'none' || playerFaction !== itemFaction) {
      var toDrop = stack.copy();
      stack.setCount(0);
      try { inv.removeItemNoUpdate(i); } catch (e) {}
      dropStackSafely(player, toDrop);
      ejectedFaction = itemFaction;
      changed = true;
    }
  }

  if (player.containerMenu) {
    var carried = player.containerMenu.getCarried();
    if (carried && !carried.isEmpty()) {
      var carriedFaction = getStackFaction(carried);
      if (carriedFaction && (playerFaction === 'none' || playerFaction !== carriedFaction)) {
        var carriedCopy = carried.copy();
        carried.setCount(0);
        dropStackSafely(player, carriedCopy);
        ejectedFaction = carriedFaction;
        changed = true;
      }
    }
  }

  if (CuriosApi) {
    try {
      var opt = CuriosApi.getCuriosInventory(player);
      if (opt && opt.isPresent()) {
        var handler = opt.get();
        var curiosMap = handler.getCurios();
        var iter = curiosMap.values().iterator();
        while (iter.hasNext()) {
          var stacksHandler = iter.next();
          var stacks = stacksHandler.getStacks();
          var slots = stacks.getSlots();
          for (var s = 0; s < slots; s++) {
            var cStack = stacks.getStackInSlot(s);
            if (!cStack || cStack.isEmpty()) continue;
            var cFaction = getStackFaction(cStack);
            if (cFaction && (playerFaction === 'none' || playerFaction !== cFaction)) {
              var cCopy = cStack.copy();
              cStack.setCount(0);
              dropStackSafely(player, cCopy);
              ejectedFaction = cFaction;
              changed = true;
            }
          }
        }
      }
    } catch (e) {}
  }

  if (changed) {
    try { player.inventoryMenu.broadcastChanges(); } catch (e) {}
    notifyEjection(player, ejectedFaction, playerFaction);
  }
}

PlayerEvents.inventoryChanged(function(event) {
  if (!event.player || event.player.level.isClientSide()) return;
  if (isForbiddenForPlayer(event.player, event.item)) {
    sweepPlayerInventory(event.player);
  }
});

PlayerEvents.tick(function(event) {
  var player = event.player;
  if (!player || player.level.isClientSide()) return;
  if (player.age % 10 === 0) {
    sweepPlayerInventory(player);
  }
  if (player.age > 80 && player.age % 900 === 0 && getPlayerFaction(player) === 'none') {
    giveSelectorStarIfMissing(player);
    sendChooseChatPrompt(player);
  }
});

ItemEvents.canPickUp(function(event) {
  if (!event.player || event.player.level.isClientSide()) return;
  if (isForbiddenForPlayer(event.player, event.item)) {
    event.cancel();
  }
});

ItemEvents.rightClicked(function(event) {
  var player = event.player;
  if (!player || player.level.isClientSide()) return;
  if (isSelectorStar(event.item)) {
    player.server.runCommandSilent('playsound minecraft:block.amethyst_block.chime master ' + player.username + ' ~ ~ ~ 1.0 1.2');
    openFactionSelectionGUI(player);
    event.cancel();
    return;
  }
  if (isForbiddenForPlayer(player, event.item)) {
    sweepPlayerInventory(player);
    event.cancel();
  }
});

BlockEvents.placed(function(event) {
  var player = event.entity;
  if (!player || !player.isPlayer || !player.isPlayer() || event.level.isClientSide()) return;
  var blockId = '' + event.block.id;
  var blockFaction = getItemIdFaction(blockId);
  if (!blockFaction) return;
  if ((player.isCreative() || player.isSpectator()) && !player.stages.has('enforce_in_creative')) return;
  var pFaction = getPlayerFaction(player);
  if (pFaction === 'none' || pFaction !== blockFaction) {
    notifyEjection(player, blockFaction, pFaction);
    event.cancel();
  }
});

// ---------- 3. ТУЛТИПЫ, ТЕГИ И АРКАННЫЕ РЕЦЕПТЫ МАГИЧЕСКИХ ДИРИЖАБЛЕЙ ----------

ServerEvents.tags('item', function(event) {
  var mageList = [];
  var techList = [];
  var sharedShipList = [];
  var iter = MCBuiltInRegistries.ITEM.keySet().iterator();
  while (iter.hasNext()) {
    var id = '' + iter.next();
    if (isSharedAirshipItem(id)) {
      sharedShipList.push(id);
      continue;
    }
    var f = getItemIdFaction(id);
    if (f === 'mage') mageList.push(id);
    else if (f === 'tech') techList.push(id);
  }
  if (mageList.length > 0) event.add('arcanum:mage_only', mageList);
  if (techList.length > 0) event.add('arcanum:tech_only', techList);
  if (sharedShipList.length > 0) event.add('arcanum:shared_airship', sharedShipList);
  console.info('[Arcanum & Machina] Размечено предметов: Маги=' + mageList.length + ', Техники=' + techList.length + ', Общее кораблестроение=' + sharedShipList.length);
});

ItemEvents.modifyTooltips(function(event) {
  event.add('#arcanum:mage_only', [Text.of('§d✦ Путь Арканы §8— §7Только для Магов')]);
  event.add('#arcanum:tech_only', [Text.of('§6⚙ Путь Механики §8— §7Только для Техников')]);
  event.add('#arcanum:shared_airship', [Text.of('§b⛵ Небесное Кораблестроение §8— §7Доступно Магам и Техникам')]);
});

// Рецепты Магических Дирижаблей из компонентов Ars Nouveau (чтобы Маги строили небесные галеоны без механизмов Create)
ServerEvents.recipes(function(event) {
  // 1. Сборщик физики корабля (Сердце Магического Галеона)
  event.shaped(
    Item.of('simulated:physics_assembler', 1),
    ['GAG', 'ESE', 'PPP'],
    {
      G: 'minecraft:gold_ingot',
      A: 'ars_nouveau:air_essence',
      E: 'minecraft:ender_eye',
      S: 'ars_nouveau:source_gem_block',
      P: 'ars_nouveau:archwood_planks'
    }
  ).id('arcanum:arcane_physics_assembler');

  // 2. Левитит — антигравитационный кристалл подъёма для кораблей Магов
  event.shaped(
    Item.of('aeronautics:levitite', 4),
    ['QAQ', 'ASA', 'QMQ'],
    {
      Q: 'minecraft:quartz',
      A: 'minecraft:amethyst_shard',
      S: 'ars_nouveau:air_essence',
      M: 'ars_nouveau:source_gem'
    }
  ).id('arcanum:arcane_levitite');

  // 3. Жемчужный левитит — усиленный кристалл левитации
  event.shaped(
    Item.of('aeronautics:pearlescent_levitite', 4),
    ['LEL', 'ECE', 'LEL'],
    {
      L: 'aeronautics:levitite',
      E: 'minecraft:ender_pearl',
      C: 'ars_nouveau:conjuration_essence'
    }
  ).id('arcanum:arcane_pearlescent_levitite');

  // 4. Эфирные оболочки купола дирижабля из волокна цветомага
  event.shaped(
    Item.of('aeronautics:purple_envelope', 8),
    ['FFF', 'WAW', 'FFF'],
    {
      F: 'ars_nouveau:magebloom_fiber',
      W: 'minecraft:purple_wool',
      A: 'ars_nouveau:air_essence'
    }
  ).id('arcanum:arcane_purple_envelope');

  event.shaped(
    Item.of('aeronautics:magenta_envelope', 8),
    ['FFF', 'WAW', 'FFF'],
    {
      F: 'ars_nouveau:magebloom_fiber',
      W: 'minecraft:magenta_wool',
      A: 'ars_nouveau:air_essence'
    }
  ).id('arcanum:arcane_magenta_envelope');

  // 5. Эфирная жаровня нагрева купола дирижабля
  event.shaped(
    Item.of('aeronautics:adjustable_burner', 1),
    ['GBG', 'FSF', 'DDD'],
    {
      G: 'minecraft:gold_ingot',
      B: 'minecraft:blaze_rod',
      F: 'ars_nouveau:fire_essence',
      S: 'ars_nouveau:source_gem',
      D: 'minecraft:polished_deepslate'
    }
  ).id('arcanum:arcane_adjustable_burner');

  // 6. Магический реактивный ускоритель на твёрдом топливе (активируется сигналом редстоуна/рычагом без валов)
  event.shaped(
    Item.of('createpropulsion:solid_fuel_thruster', 2),
    ['OGO', 'FAF', 'OSO'],
    {
      O: 'minecraft:obsidian',
      G: 'minecraft:gold_ingot',
      F: 'ars_nouveau:fire_essence',
      A: 'ars_nouveau:air_essence',
      S: 'ars_nouveau:source_gem_block'
    }
  ).id('arcanum:arcane_solid_fuel_thruster');

  // 7. Штурвал и рычаг тяги из архдревесины
  event.shaped(
    Item.of('simulated:steering_wheel', 1),
    [' P ', 'PSP', ' G '],
    {
      P: 'ars_nouveau:archwood_planks',
      S: 'ars_nouveau:source_gem',
      G: 'minecraft:gold_ingot'
    }
  ).id('arcanum:arcane_steering_wheel');

  event.shaped(
    Item.of('simulated:throttle_lever', 1),
    [' S ', ' G ', 'PPP'],
    {
      S: 'ars_nouveau:source_gem',
      G: 'minecraft:gold_ingot',
      P: 'ars_nouveau:archwood_planks'
    }
  ).id('arcanum:arcane_throttle_lever');

  // 8. Навигационный стол и скрепляющий клей корпуса
  event.shaped(
    Item.of('simulated:navigation_table', 1),
    ['GCG', 'PSP', 'PPP'],
    {
      G: 'minecraft:gold_ingot',
      C: 'minecraft:compass',
      P: 'ars_nouveau:archwood_planks',
      S: 'ars_nouveau:source_gem'
    }
  ).id('arcanum:arcane_navigation_table');

  event.shaped(
    Item.of('simulated:honey_glue', 1),
    ['FMF', 'MSM', 'FMF'],
    {
      F: 'ars_nouveau:magebloom_fiber',
      M: 'minecraft:honeycomb',
      S: 'ars_nouveau:source_gem'
    }
  ).id('arcanum:arcane_ship_glue');

  // 9. Магические паруса и крылья
  event.shaped(
    Item.of('simulated:white_symmetric_sail', 4),
    ['FPF', 'PAP', 'FPF'],
    {
      F: 'ars_nouveau:magebloom_fiber',
      P: 'ars_nouveau:archwood_planks',
      A: 'ars_nouveau:air_essence'
    }
  ).id('arcanum:arcane_symmetric_sail');

  event.shaped(
    Item.of('createpropulsion:wing', 4),
    ['FFP', 'FSP', 'FFP'],
    {
      F: 'ars_nouveau:magebloom_fiber',
      P: 'ars_nouveau:archwood_planks',
      S: 'ars_nouveau:source_gem'
    }
  ).id('arcanum:arcane_ship_wing');
});

// ---------- 4. СИСТЕМА 5 ОСТРОВОВ (1 НЕЙТРАЛЬНЫЙ + 2 МАГИ + 2 ТЕХНИКИ) ----------

var ISLAND_KEYS = ['neutral', 'mage1', 'mage2', 'tech1', 'tech2'];

var ISLAND_DEFS = {
  neutral: {
    key: 'neutral',
    faction: 'none',
    shortName: 'Остров Равновесия',
    title: 'Остров Равновесия (Нейтральный Спавн)',
    targetX: 0,
    targetZ: 0,
    baseY: 112,
    radius: 52,
    searchRadius: 320
  },
  mage1: {
    key: 'mage1',
    faction: 'mage',
    shortName: 'Шпиль Эфира (Остров I)',
    title: 'Шпиль Эфира (Остров Магов I — Север)',
    targetX: 0,
    targetZ: -3200,
    baseY: 108,
    radius: 132,
    searchRadius: 800
  },
  mage2: {
    key: 'mage2',
    faction: 'mage',
    shortName: 'Роща Арканы (Остров II)',
    title: 'Роща Арканы (Остров Магов II — Юг)',
    targetX: 0,
    targetZ: 3200,
    baseY: 108,
    radius: 132,
    searchRadius: 800
  },
  tech1: {
    key: 'tech1',
    faction: 'tech',
    shortName: 'Цитадель Шестерён (Остров I)',
    title: 'Цитадель Шестерён (Остров Техников I — Восток)',
    targetX: 3200,
    targetZ: 0,
    baseY: 108,
    radius: 132,
    searchRadius: 800
  },
  tech2: {
    key: 'tech2',
    faction: 'tech',
    shortName: 'Кузня Индустрии (Остров II)',
    title: 'Кузня Индустрии (Остров Техников II — Запад)',
    targetX: -3200,
    targetZ: 0,
    baseY: 108,
    radius: 132,
    searchRadius: 800
  }
};

function getSolidTopY(level, x, z) {
  level.getChunk(x >> 4, z >> 4);
  var topY = level.getHeight(MCHeightmapTypes.MOTION_BLOCKING_NO_LEAVES, x, z);
  if (topY <= level.getMinBuildHeight() + 4 || topY > 250) return -1;
  var below = level.getBlockState(new MCBlockPos(x, topY - 1, z));
  if (below.isAir() || !below.getFluidState().isEmpty()) return -1;
  if (topY <= 67) return -1;
  return topY;
}

function findLargeNaturalIsland(level, centerX, centerZ, maxRadius) {
  var step = maxRadius >= 600 ? 320 : 160;
  var neighborSpan = maxRadius >= 600 ? 64 : 28;
  for (var r = 0; r <= maxRadius; r += step) {
    var candidates = [];
    if (r === 0) {
      candidates.push([centerX, centerZ]);
    } else {
      for (var dx = -r; dx <= r; dx += step) {
        candidates.push([centerX + dx, centerZ - r]);
        candidates.push([centerX + dx, centerZ + r]);
      }
      for (var dz = -r + step; dz <= r - step; dz += step) {
        candidates.push([centerX - r, centerZ + dz]);
        candidates.push([centerX + r, centerZ + dz]);
      }
    }
    for (var i = 0; i < candidates.length; i++) {
      var cx = candidates[i][0];
      var cz = candidates[i][1];
      var cy = getSolidTopY(level, cx, cz);
      if (cy < 72) continue;
      // Проверяем, что под островом мощная толща породы под руды (минимум 32 блока глубиной!)
      if (maxRadius >= 600) {
        var deepCheck = level.getBlockState(new MCBlockPos(cx, Math.max(-20, cy - 32), cz));
        if (deepCheck.isAir()) continue;
      }
      var solidNeighbors = 0;
      var offsets = [[neighborSpan, 0], [-neighborSpan, 0], [0, neighborSpan], [0, -neighborSpan]];
      for (var k = 0; k < offsets.length; k++) {
        var ny = getSolidTopY(level, cx + offsets[k][0], cz + offsets[k][1]);
        if (ny >= 70 && Math.abs(ny - cy) <= 36) solidNeighbors++;
      }
      if (solidNeighbors >= 3) {
        return { x: cx, y: cy, z: cz };
      }
    }
  }
  return null;
}

function tryBlockState(idStr, fallbackState) {
  try {
    var b = Block.getBlock(idStr);
    if (b && b !== MCBlocks.AIR) return b.defaultBlockState();
  } catch (e) {}
  return fallbackState;
}

function sculptColossalIsland(level, cx, cy, cz, radius, faction) {
  console.info('[Arcanum & Machina] Скульптурирование биом-острова (' + faction + ') в [' + cx + ', ' + cy + ', ' + cz + '], R=' + radius + '...');
  var minChunkX = (cx - radius - 8) >> 4;
  var maxChunkX = (cx + radius + 8) >> 4;
  var minChunkZ = (cz - radius - 8) >> 4;
  var maxChunkZ = (cz + radius + 8) >> 4;
  for (var chx = minChunkX; chx <= maxChunkX; chx++) {
    for (var chz = minChunkZ; chz <= maxChunkZ; chz++) {
      level.getChunk(chx, chz);
    }
  }

  var stone = MCBlocks.STONE.defaultBlockState();
  var deepslate = MCBlocks.DEEPSLATE.defaultBlockState();
  var dirt = MCBlocks.DIRT.defaultBlockState();
  var grass = MCBlocks.GRASS_BLOCK.defaultBlockState();
  var moss = MCBlocks.MOSS_BLOCK.defaultBlockState();
  var water = MCBlocks.WATER.defaultBlockState();
  var coalOre = MCBlocks.COAL_ORE.defaultBlockState();
  var ironOre = MCBlocks.IRON_ORE.defaultBlockState();
  var copperOre = MCBlocks.COPPER_ORE.defaultBlockState();
  var goldOre = MCBlocks.DEEPSLATE_GOLD_ORE.defaultBlockState();
  var redstoneOre = MCBlocks.DEEPSLATE_REDSTONE_ORE.defaultBlockState();
  var lapisOre = MCBlocks.DEEPSLATE_LAPIS_ORE.defaultBlockState();
  var diamondOre = MCBlocks.DEEPSLATE_DIAMOND_ORE.defaultBlockState();
  var emeraldOre = MCBlocks.EMERALD_ORE.defaultBlockState();
  var amethyst = MCBlocks.AMETHYST_BLOCK.defaultBlockState();
  var tuff = MCBlocks.TUFF.defaultBlockState();

  var zincOre = tryBlockState('create:zinc_ore', ironOre);
  var deepZincOre = tryBlockState('create:deepslate_zinc_ore', goldOre);
  var tinOre = tryBlockState('modern_industrialization:tin_ore', copperOre);
  var leadOre = tryBlockState('modern_industrialization:deepslate_lead_ore', goldOre);
  var nickelOre = tryBlockState('modern_industrialization:deepslate_nickel_ore', ironOre);
  var bauxiteOre = tryBlockState('modern_industrialization:bauxite_ore', copperOre);
  var silverOre = tryBlockState('occultism:silver_ore_deepslate', lapisOre);
  var uraniniteOre = tryBlockState('powah:deepslate_uraninite_ore', redstoneOre);

  // Глубокий массивный корень континента (до ~105 блоков толщиной, уходящий в Deepslate!)
  var maxDepth = Math.min(106, Math.floor(radius * 0.82));

  for (var dx = -radius; dx <= radius; dx++) {
    for (var dz = -radius; dz <= radius; dz++) {
      var dist = Math.sqrt(dx * dx + dz * dz);
      var angle = Math.atan2(dz, dx);
      var contour = radius * (0.85 + 0.08 * Math.sin(3 * angle + 0.7) + 0.05 * Math.cos(5 * angle - 0.4) + 0.03 * Math.sin(7 * angle));
      if (dist > contour) continue;

      var norm = dist / contour;
      var hillFactor = (1 - norm) * (1 + norm * 0.6);
      var surfaceHill = Math.round(
        hillFactor * (5.5 * Math.sin(dx * 0.045) * Math.cos(dz * 0.045) + 3.2 * Math.cos((dx + dz) * 0.03))
      );
      var topOffset = dist <= 10 ? 0 : surfaceHill;
      var topY = cy + topOffset;

      var crag = (1 - norm) * (6.0 * Math.sin(dx * 0.16) * Math.cos(dz * 0.19) + 3.5 * Math.sin((dx - dz) * 0.29));
      var cone = maxDepth * Math.pow(1 - norm, 1.15);
      var thickness = Math.max(2, Math.round(cone + crag));
      var bottomY = Math.max(-32, topY - thickness);

      var wx = cx + dx;
      var wz = cz + dz;

      for (var y = bottomY; y <= topY; y++) {
        var state = stone;
        if (y === topY) {
          state = (faction === 'mage' && ((dx * 13 + dz * 7) & 7) === 0 && dist > 10) ? moss : grass;
        } else if (y >= topY - 3 || (y === topY - 4 && norm < 0.7)) {
          state = dirt;
        } else {
          var depthFromTop = topY - y;
          var hash = Math.abs((wx * 73428767 ^ wz * 912931 ^ y * 45679) | 0) % 1000;
          if (y < 42 || depthFromTop > 42) {
            state = deepslate;
            if (hash < 10) state = goldOre;
            else if (hash < 24) state = redstoneOre;
            else if (hash < 34) state = lapisOre;
            else if (hash < 41) state = diamondOre;
            else if (hash < 53) state = deepZincOre;
            else if (hash < 64) state = leadOre;
            else if (hash < 74) state = nickelOre;
            else if (hash < 84) state = silverOre;
            else if (hash < 91) state = uraniniteOre;
            else if (hash < 108 && faction === 'mage') state = amethyst;
            else if (hash < 125 && faction === 'tech') state = tuff;
          } else {
            if (hash < 24) state = coalOre;
            else if (hash < 48) state = ironOre;
            else if (hash < 70) state = copperOre;
            else if (hash < 86) state = zincOre;
            else if (hash < 100) state = tinOre;
            else if (hash < 112) state = bauxiteOre;
            else if (hash < 116) state = emeraldOre;
          }
        }
        level.setBlock(new MCBlockPos(wx, y, wz), state, 2);
      }
    }
  }

  if (radius >= 50) {
    var pondX = cx + 22;
    var pondZ = cz + 18;
    for (var px = -6; px <= 6; px++) {
      for (var pz = -6; pz <= 6; pz++) {
        if (px * px + pz * pz <= 28) {
          level.setBlock(new MCBlockPos(pondX + px, cy, pondZ + pz), water, 2);
          level.setBlock(new MCBlockPos(pondX + px, cy - 1, pondZ + pz), MCBlocks.CLAY.defaultBlockState(), 2);
        }
      }
    }
  }
}

function buildArrivalSanctum(level, cx, cy, cz, faction) {
  var air = MCBlocks.AIR.defaultBlockState();
  var floorMain = faction === 'mage'
    ? MCBlocks.POLISHED_DEEPSLATE.defaultBlockState()
    : faction === 'tech'
      ? MCBlocks.POLISHED_TUFF.defaultBlockState()
      : MCBlocks.STONE_BRICKS.defaultBlockState();
  var floorAccent = faction === 'mage'
    ? MCBlocks.AMETHYST_BLOCK.defaultBlockState()
    : faction === 'tech'
      ? MCBlocks.COPPER_BLOCK.defaultBlockState()
      : MCBlocks.CHISELED_STONE_BRICKS.defaultBlockState();
  var pillar = faction === 'mage'
    ? MCBlocks.QUARTZ_PILLAR.defaultBlockState()
    : faction === 'tech'
      ? MCBlocks.POLISHED_ANDESITE.defaultBlockState()
      : MCBlocks.SMOOTH_STONE.defaultBlockState();
  var light = faction === 'mage'
    ? MCBlocks.SEA_LANTERN.defaultBlockState()
    : faction === 'tech'
      ? MCBlocks.OCHRE_FROGLIGHT.defaultBlockState()
      : MCBlocks.GLOWSTONE.defaultBlockState();

  for (var dx = -4; dx <= 4; dx++) {
    for (var dz = -4; dz <= 4; dz++) {
      if (Math.abs(dx) === 4 && Math.abs(dz) === 4) continue;
      var isBorder = Math.abs(dx) === 4 || Math.abs(dz) === 4 || (dx === 0 && dz === 0);
      level.setBlock(new MCBlockPos(cx + dx, cy - 1, cz + dz), isBorder ? floorAccent : floorMain, 2);
      for (var dy = 0; dy <= 5; dy++) {
        level.setBlock(new MCBlockPos(cx + dx, cy + dy, cz + dz), air, 2);
      }
    }
  }

  var corners = [[-3, -3], [-3, 3], [3, -3], [3, 3]];
  for (var i = 0; i < corners.length; i++) {
    var px = cx + corners[i][0];
    var pz = cz + corners[i][1];
    level.setBlock(new MCBlockPos(px, cy, pz), pillar, 2);
    level.setBlock(new MCBlockPos(px, cy + 1, pz), pillar, 2);
    level.setBlock(new MCBlockPos(px, cy + 2, pz), pillar, 2);
    level.setBlock(new MCBlockPos(px, cy + 3, pz), light, 2);
  }

  if (faction !== 'none') {
    var logState = faction === 'mage' ? MCBlocks.DARK_OAK_LOG.defaultBlockState() : MCBlocks.SPRUCE_LOG.defaultBlockState();
    var leafState = faction === 'mage' ? MCBlocks.AZALEA_LEAVES.defaultBlockState() : MCBlocks.SPRUCE_LEAVES.defaultBlockState();
    var treeSpots = [[14, -12], [-15, 11], [-14, -15], [16, 16], [24, 0], [-24, -4]];
    for (var t = 0; t < treeSpots.length; t++) {
      var tx = cx + treeSpots[t][0];
      var tz = cz + treeSpots[t][1];
      var ty = getSolidTopY(level, tx, tz);
      if (ty < 70) continue;
      for (var h = 0; h < 5; h++) {
        level.setBlock(new MCBlockPos(tx, ty + h, tz), logState, 2);
      }
      for (var lx = -2; lx <= 2; lx++) {
        for (var lz = -2; lz <= 2; lz++) {
          for (var ly = 3; ly <= 5; ly++) {
            if (Math.abs(lx) === 2 && Math.abs(lz) === 2 && ly === 5) continue;
            var pos = new MCBlockPos(tx + lx, ty + ly, tz + lz);
            if (level.getBlockState(pos).isAir()) level.setBlock(pos, leafState, 2);
          }
        }
      }
      level.setBlock(new MCBlockPos(tx, ty + 6, tz), leafState, 2);
    }
  }
}

function getIslandsStore(server) {
  var root = server.persistentData;
  if (!root.contains('arcanumIslands')) {
    root.put('arcanumIslands', {});
  }
  return root.getCompound('arcanumIslands');
}

function ensureIsland(server, key) {
  var def = ISLAND_DEFS[key];
  if (!def) return null;
  var overworld = server.overworld();
  var store = getIslandsStore(server);

  if (store.contains(key)) {
    var saved = store.getCompound(key);
    if (saved.getBoolean('ready')) {
      return {
        key: key,
        title: def.title,
        faction: def.faction,
        x: saved.getInt('x'),
        y: saved.getInt('y'),
        z: saved.getInt('z'),
        mode: '' + (saved.getString('mode') || 'saved')
      };
    }
  }

  var found = findLargeNaturalIsland(overworld, def.targetX, def.targetZ, def.searchRadius);
  var mode = 'natural';
  if (!found) {
    mode = 'sculpted';
    sculptColossalIsland(overworld, def.targetX, def.baseY, def.targetZ, def.radius, def.faction);
    found = { x: def.targetX, y: def.baseY + 1, z: def.targetZ };
  }

  buildArrivalSanctum(overworld, found.x, found.y, found.z, def.faction);

  store.put(key, {
    ready: true,
    x: found.x,
    y: found.y,
    z: found.z,
    mode: mode
  });

  if (key === 'neutral') {
    overworld.setDefaultSpawnPos(new MCBlockPos(found.x, found.y, found.z), 0);
  }

  console.info('[Arcanum & Machina] Остров "' + def.title + '" готов: [' + found.x + ', ' + found.y + ', ' + found.z + '] (' + mode + ')');
  return {
    key: key,
    title: def.title,
    faction: def.faction,
    x: found.x,
    y: found.y,
    z: found.z,
    mode: mode
  };
}

function setCustomIslandPos(server, key, x, y, z) {
  var def = ISLAND_DEFS[key];
  if (!def) return null;
  var store = getIslandsStore(server);
  store.put(key, {
    ready: true,
    x: Math.floor(x),
    y: Math.floor(y),
    z: Math.floor(z),
    mode: 'custom'
  });
  if (key === 'neutral') {
    server.overworld().setDefaultSpawnPos(new MCBlockPos(Math.floor(x), Math.floor(y), Math.floor(z)), 0);
  }
  return ensureIsland(server, key);
}

function getIslandCounts(server) {
  var root = server.persistentData;
  if (!root.contains('arcanumCounts')) {
    root.put('arcanumCounts', { mage1: 0, mage2: 0, tech1: 0, tech2: 0 });
  }
  return root.getCompound('arcanumCounts');
}

function pickBalancedIsland(server, faction) {
  var c = getIslandCounts(server);
  if (faction === 'mage') {
    return c.getInt('mage1') <= c.getInt('mage2') ? 'mage1' : 'mage2';
  }
  return c.getInt('tech1') <= c.getInt('tech2') ? 'tech1' : 'tech2';
}

function isInsideNeutralSpawnProtection(server, level, blockPos) {
  if (('' + level.dimension) !== 'minecraft:overworld') return false;
  var store = getIslandsStore(server);
  if (!store.contains('neutral')) return false;
  var n = store.getCompound('neutral');
  var dx = blockPos.getX() - n.getInt('x');
  var dz = blockPos.getZ() - n.getInt('z');
  return (dx * dx + dz * dz) <= (42 * 42);
}

BlockEvents.broken(function(event) {
  var player = event.entity;
  if (!player || !player.isPlayer || !player.isPlayer() || event.level.isClientSide()) return;
  if (player.isCreative() || player.isOp()) return;
  if (isInsideNeutralSpawnProtection(event.server, event.level, event.block.pos)) {
    player.setStatusMessage(Text.of('§e⚖ Нейтральный остров защищён. Выберите свой Путь (клавиша H или ПКМ звездой)!'));
    event.cancel();
  }
});

BlockEvents.placed(function(event) {
  var player = event.entity;
  if (!player || !player.isPlayer || !player.isPlayer() || event.level.isClientSide()) return;
  if (player.isCreative() || player.isOp()) return;
  if (isInsideNeutralSpawnProtection(event.server, event.level, event.block.pos)) {
    player.setStatusMessage(Text.of('§e⚖ Нейтральный остров защищён. Выберите свой Путь (клавиша H или ПКМ звездой)!'));
    event.cancel();
  }
});

ServerEvents.loaded(function(event) {
  ensureIsland(event.server, 'neutral');
});

// ---------- 5. ОТКРЫТИЕ ПОЛНОЭКРАННОГО КАСТОМНОГО UI И НАДЁЖНАЯ ТЕЛЕПОРТАЦИЯ ----------

function teleportToIsland(player, island) {
  var server = player.server;
  var overworld = server.overworld();
  overworld.getChunk(island.x >> 4, island.z >> 4);
  var pname = '' + player.username;
  var tx = island.x + 0.5;
  var ty = island.y + 0.5;
  var tz = island.z + 0.5;

  // Выполняем с правами сервера (permission 4), чтобы гарантированно работало даже в Выживании без читов!
  server.runCommandSilent('effect give ' + pname + ' minecraft:resistance 14 4 true');
  server.runCommandSilent('effect give ' + pname + ' minecraft:slow_falling 12 0 true');
  server.runCommandSilent('execute in minecraft:overworld run tp ' + pname + ' ' + tx + ' ' + ty + ' ' + tz + ' 0 0');
  server.runCommandSilent('execute in minecraft:overworld run spawnpoint ' + pname + ' ' + island.x + ' ' + island.y + ' ' + island.z);

  try {
    if (('' + player.level.dimension) === 'minecraft:overworld') {
      player.connection.teleport(tx, ty, tz, 0, 0);
    }
  } catch (e) {}
}

function grantStarterKit(player, faction) {
  if (player.stages.has('starter_received')) return;
  player.stages.add('starter_received');

  player.give(Item.of('minecraft:bread', 12));
  player.give(Item.of('minecraft:torch', 16));
  player.give(Item.of('minecraft:oak_sapling', 4));

  if (faction === 'mage') {
    try { player.give(Item.of('ars_nouveau:worn_notebook', 1)); } catch (e) {}
    try { player.give(Item.of('ars_nouveau:novice_spell_book', 1)); } catch (e) {}
    try { player.give(Item.of('minecraft:amethyst_shard', 8)); } catch (e) {}
    try { player.give(Item.of('aeronautics:levitite', 2)); } catch (e) {}
  } else if (faction === 'tech') {
    try { player.give(Item.of('create:wrench', 1)); } catch (e) {}
    try { player.give(Item.of('create:goggles', 1)); } catch (e) {}
    try { player.give(Item.of('create:andesite_alloy', 12)); } catch (e) {}
  }
}

function openFactionSelectionGUI(player, forceAllowChange) {
  if (!player) return;
  if (forceAllowChange) {
    player.persistentData.putBoolean('allowFactionChange', true);
  }
  var counts = getIslandCounts(player.server);
  var curFaction = (forceAllowChange || player.persistentData.getBoolean('allowFactionChange'))
    ? 'none'
    : getPlayerFaction(player);
  if (ArcanumUiMod) {
    ArcanumUiMod.openForPlayer(
      player,
      counts.getInt('mage1'),
      counts.getInt('mage2'),
      counts.getInt('tech1'),
      counts.getInt('tech2'),
      curFaction
    );
    return;
  }
  sendChooseChatPrompt(player);
}

function assignPlayerPath(player, choiceInput, forceAdmin) {
  var current = getPlayerFaction(player);
  if (current !== 'none' && !forceAdmin) {
    var label = current === 'mage' ? '§dМагов (Путь Арканы)' : '§6Техников (Путь Механики)';
    player.tell(Text.of('§cВы уже выбрали сторону ' + label + '§c! Возврат на остров: §e/island_home'));
    return false;
  }

  var islandKey = ('' + (choiceInput || '')).trim().toLowerCase();
  if (islandKey === 'mage' || islandKey === 'magic') {
    islandKey = pickBalancedIsland(player.server, 'mage');
  } else if (islandKey === 'tech' || islandKey === 'engineer') {
    islandKey = pickBalancedIsland(player.server, 'tech');
  }

  if (!VALID_FACTION_ISLANDS[islandKey]) {
    openFactionSelectionGUI(player);
    return false;
  }

  var faction = islandKey.indexOf('mage') === 0 ? 'mage' : 'tech';

  player.stages.remove('faction_mage');
  player.stages.remove('faction_tech');
  player.stages.remove('island_mage1');
  player.stages.remove('island_mage2');
  player.stages.remove('island_tech1');
  player.stages.remove('island_tech2');

  player.stages.add(faction === 'mage' ? 'faction_mage' : 'faction_tech');
  player.stages.add('island_' + islandKey);

  var counts = getIslandCounts(player.server);
  counts.putInt(islandKey, counts.getInt(islandKey) + 1);

  removeSelectorStars(player);

  player.tell(Text.of('§e✦ Подготовка вашего парящего острова и перемещение...'));
  var island = ensureIsland(player.server, islandKey);
  player.persistentData.putString('homeIsland', islandKey);

  sweepPlayerInventory(player);
  teleportToIsland(player, island);
  grantStarterKit(player, faction);
  removeSelectorStars(player);
  player.server.scheduleInTicks(3, function() {
    removeSelectorStars(player);
  });

  if (faction === 'mage') {
    player.tell(Text.of('§d✦ Вы вступили на Путь Арканы! §7Ваш дом: §f' + island.title + ' §8[' + island.x + ', ' + island.y + ', ' + island.z + ']'));
    player.tell(Text.of('§b⛵ Вам доступно строительство Магических Дирижаблей на кристаллах Левитита и парусах из цветомага!'));
    player.server.runCommandSilent('playsound minecraft:block.enchantment_table.use master ' + player.username + ' ~ ~ ~ 1.0 1.0');
  } else {
    player.tell(Text.of('§6⚙ Вы вступили на Путь Механики! §7Ваш дом: §f' + island.title + ' §8[' + island.x + ', ' + island.y + ', ' + island.z + ']'));
    player.tell(Text.of('§e⛵ Вам доступно строительство Бронедирижаблей на винтах, котлах и дизельных двигателях!'));
    player.server.runCommandSilent('playsound minecraft:block.anvil.use master ' + player.username + ' ~ ~ ~ 0.85 1.15');
  }
  console.info('[Arcanum & Machina] Игрок ' + player.username + ' выбрал ' + islandKey + ' -> телепортирован на [' + island.x + ', ' + island.y + ', ' + island.z + ']');
  return true;
}

function sendChooseChatPrompt(player) {
  player.tell(Text.of('§8================================================'));
  player.tell(Text.of('§f✦ §bДобро пожаловать в мир Arcanum & Machina! §f⚙'));
  player.tell(Text.of('§7Откройте меню выбора: клавиша §e[H]§7, §eПКМ звездой§7 в хотбаре или §e/choose_path'));
  player.tell(Text.of('§8================================================'));
}

PlayerEvents.loggedIn(function(event) {
  var player = event.player;
  if (!player) return;

  var faction = getPlayerFaction(player);
  if (faction === 'none') {
    var neutral = ensureIsland(event.server, 'neutral');
    var dx = player.x - neutral.x;
    var dz = player.z - neutral.z;
    if (!player.isCreative() && !player.isSpectator() && (dx * dx + dz * dz > 64 * 64 || player.y < 60)) {
      teleportToIsland(player, neutral);
    }
    giveSelectorStarIfMissing(player);
    sendChooseChatPrompt(player);
    event.server.scheduleInTicks(35, function() {
      if (player.isAlive() && getPlayerFaction(player) === 'none') {
        openFactionSelectionGUI(player);
      }
    });
  } else {
    removeSelectorStars(player);
    sweepPlayerInventory(player);
  }
});

PlayerEvents.respawned(function(event) {
  var player = event.player;
  if (!player) return;
  var faction = getPlayerFaction(player);
  if (faction === 'none') {
    var neutral = ensureIsland(event.server, 'neutral');
    teleportToIsland(player, neutral);
    giveSelectorStarIfMissing(player);
    event.server.scheduleInTicks(30, function() {
      if (player.isAlive() && getPlayerFaction(player) === 'none') {
        openFactionSelectionGUI(player);
      }
    });
    return;
  }
  var homeKey = '' + (player.persistentData.getString('homeIsland') || '');
  if (homeKey && ISLAND_DEFS[homeKey]) {
    var neutralPos = ensureIsland(event.server, 'neutral');
    var distSqToNeutral = (player.x - neutralPos.x) * (player.x - neutralPos.x) + (player.z - neutralPos.z) * (player.z - neutralPos.z);
    if (distSqToNeutral <= 48 * 48) {
      var homeIsland = ensureIsland(event.server, homeKey);
      teleportToIsland(player, homeIsland);
    }
  }
});

// ---------- 6. ПУБЛИЧНЫЕ И АДМИНСКИЕ КОМАНДЫ ----------

function formatFactionBadge(faction) {
  if (faction === 'mage') return '§d✦ Путь Арканы (Маг)';
  if (faction === 'tech') return '§6⚙ Путь Механики (Техник)';
  return '§7○ Не выбрана (Нейтральный остров)';
}

function getOnlineSideSummary(server) {
  var mages = [];
  var techs = [];
  var neutrals = [];
  var list = server.players;
  for (var i = 0; i < list.size(); i++) {
    var p = list.get(i);
    var f = getPlayerFaction(p);
    if (f === 'mage') mages.push('' + p.username);
    else if (f === 'tech') techs.push('' + p.username);
    else neutrals.push('' + p.username);
  }
  return { mages: mages, techs: techs, neutrals: neutrals };
}

function tellResponder(responder, msg) {
  if (!responder) return;
  if (typeof responder.tell === 'function') {
    responder.tell(Text.of(msg));
  } else if (typeof responder.respond === 'function') {
    responder.respond(Text.of(msg));
  } else if (typeof responder.sendSuccess === 'function') {
    responder.sendSuccess(function() { return Text.of(msg); }, false);
  }
}

function inspectPlayerSide(responder, server, targetPlayer) {
  if (!targetPlayer) {
    tellResponder(responder, '§cИгрок не найден в сети.');
    return 0;
  }
  var faction = getPlayerFaction(targetPlayer);
  var homeKey = '' + (targetPlayer.persistentData.getString('homeIsland') || '');
  var homeTitle = (homeKey && ISLAND_DEFS[homeKey]) ? ISLAND_DEFS[homeKey].title : 'Нейтральный Остров Равновесия';
  var store = getIslandsStore(server);
  var coordsText = '';
  if (homeKey && store.contains(homeKey)) {
    var s = store.getCompound(homeKey);
    coordsText = ' §8[' + s.getInt('x') + ', ' + s.getInt('y') + ', ' + s.getInt('z') + ']';
  }
  var summary = getOnlineSideSummary(server);

  tellResponder(responder, '§8------------------------------------------------');
  tellResponder(responder, '§fИгрок: §e' + targetPlayer.username + ' §8| §fСторона: ' + formatFactionBadge(faction));
  tellResponder(responder, '§7Домашний остров: §f' + homeTitle + coordsText);
  tellResponder(responder, '§7Баланс онлайн: §d✦ Маги: ' + summary.mages.length + ' §8| §6⚙ Техники: ' + summary.techs.length + (summary.neutrals.length > 0 ? ' §8| §7Выбирают: ' + summary.neutrals.length : ''));
  tellResponder(responder, '§8------------------------------------------------');
  return 1;
}

function listAllOnlineSides(responder, server) {
  var summary = getOnlineSideSummary(server);
  tellResponder(responder, '§8================ §f✦ Стороны Онлайн ⚙ §8================');
  tellResponder(responder, '§d✦ Маги (' + summary.mages.length + '): §f' + (summary.mages.length ? summary.mages.join(', ') : '§8нет в сети'));
  tellResponder(responder, '§6⚙ Техники (' + summary.techs.length + '): §f' + (summary.techs.length ? summary.techs.join(', ') : '§8нет в сети'));
  if (summary.neutrals.length > 0) {
    tellResponder(responder, '§7○ Не выбрали (' + summary.neutrals.length + '): §f' + summary.neutrals.join(', '));
  }
  tellResponder(responder, '§8====================================================');
  return 1;
}

function resetPlayerFactionState(server, target) {
  target.stages.remove('faction_mage');
  target.stages.remove('faction_tech');
  target.stages.remove('island_mage1');
  target.stages.remove('island_mage2');
  target.stages.remove('island_tech1');
  target.stages.remove('island_tech2');
  target.persistentData.remove('homeIsland');
  target.persistentData.putBoolean('allowFactionChange', true);
  var neutralTarget = ensureIsland(server, 'neutral');
  teleportToIsland(target, neutralTarget);
  giveSelectorStarIfMissing(target);
  sweepPlayerInventory(target);
  openFactionSelectionGUI(target, true);
}

function adminApplySideChange(responder, server, target, rawChoice) {
  if (!target) {
    tellResponder(responder, '§cИгрок не найден в сети.');
    return 0;
  }
  var choice = ('' + (rawChoice || '')).trim().toLowerCase();
  if (choice === 'reset' || choice === 'none') {
    resetPlayerFactionState(server, target);
    target.tell(Text.of('§e✦ Оператор сбросил вашу сторону. Выберите новый путь в открывшемся меню!'));
    tellResponder(responder, '§aСторона игрока §f' + target.username + ' §aсброшена, открыто меню выбора.');
    return 1;
  }
  if (choice === 'menu' || choice === 'gui') {
    openFactionSelectionGUI(target, true);
    target.tell(Text.of('§e✦ Оператор открыл вам меню смены стороны и острова!'));
    tellResponder(responder, '§aИгроку §f' + target.username + ' §aоткрыто меню выбора стороны.');
    return 1;
  }
  if (choice !== 'mage' && choice !== 'tech' && !VALID_FACTION_ISLANDS[choice]) {
    tellResponder(responder, '§cУкажите: mage, tech, mage1, mage2, tech1, tech2, menu или reset');
    return 0;
  }
  assignPlayerPath(target, choice, true);
  tellResponder(responder, '§aИгроку §f' + target.username + ' §aустановлена сторона: ' + formatFactionBadge(getPlayerFaction(target)) + ' §7(' + target.persistentData.getString('homeIsland') + ').');
  return 1;
}

// Brigadier-регистрация с автодополнением по Tab: /side, /sides, /sidemenu, /setside
ServerEvents.commandRegistry(function(event) {
  var Commands = event.commands;
  var Arguments = event.arguments;

  // 1) /side [ник] — доступно всем игрокам (проверка своей или чужой стороны)
  event.register(
    Commands.literal('side')
      .executes(function(ctx) {
        var src = ctx.source;
        var srv = src.server;
        var selfPlayer = src.player;
        if (!selfPlayer) return listAllOnlineSides(src, srv);
        return inspectPlayerSide(selfPlayer, srv, selfPlayer);
      })
      .then(
        Commands.literal('list').executes(function(ctx) {
          var src = ctx.source;
          return listAllOnlineSides(src.player || src, src.server);
        })
      )
      .then(
        Commands.argument('player', Arguments.PLAYER.create(event))
          .executes(function(ctx) {
            var src = ctx.source;
            var target = Arguments.PLAYER.getResult(ctx, 'player');
            return inspectPlayerSide(src.player || src, src.server, target);
          })
      )
  );

  // 2) /sides — сводка всех онлайн-игроков по сторонам (доступно всем)
  event.register(
    Commands.literal('sides')
      .executes(function(ctx) {
        var src = ctx.source;
        return listAllOnlineSides(src.player || src, src.server);
      })
  );

  // 3) /sidemenu [ник] — для операторов: открыть игроку меню выбора/смены стороны
  event.register(
    Commands.literal('sidemenu')
      .requires(function(src) { return src.hasPermission(2); })
      .executes(function(ctx) {
        var src = ctx.source;
        var selfPlayer = src.player;
        if (!selfPlayer) {
          tellResponder(src, '§cУкажите ник игрока: /sidemenu <ник>');
          return 0;
        }
        openFactionSelectionGUI(selfPlayer, true);
        tellResponder(selfPlayer, '§aОткрыто меню смены стороны и острова.');
        return 1;
      })
      .then(
        Commands.argument('player', Arguments.PLAYER.create(event))
          .executes(function(ctx) {
            var src = ctx.source;
            var target = Arguments.PLAYER.getResult(ctx, 'player');
            openFactionSelectionGUI(target, true);
            target.tell(Text.of('§e✦ Оператор открыл вам меню смены Пути и Острова!'));
            tellResponder(src.player || src, '§aИгроку §f' + target.username + ' §aоткрыто меню выбора/смены стороны.');
            return 1;
          })
      )
  );

  // 4) /setside <ник> <mage|tech|mage1|mage2|tech1|tech2|menu|reset> — для операторов
  var sideChoices = ['mage', 'tech', 'mage1', 'mage2', 'tech1', 'tech2', 'menu', 'reset'];
  var playerArgNode = Commands.argument('player', Arguments.PLAYER.create(event));
  for (var ci = 0; ci < sideChoices.length; ci++) {
    (function(choiceLiteral) {
      playerArgNode = playerArgNode.then(
        Commands.literal(choiceLiteral).executes(function(ctx) {
          var src = ctx.source;
          var target = Arguments.PLAYER.getResult(ctx, 'player');
          return adminApplySideChange(src.player || src, src.server, target, choiceLiteral);
        })
      );
    })(sideChoices[ci]);
  }
  event.register(
    Commands.literal('setside')
      .requires(function(src) { return src.hasPermission(2); })
      .then(playerArgNode)
  );
});

ServerEvents.basicPublicCommand('choose_path', function(event) {
  var player = event.player;
  if (!player) return;
  var arg = ('' + (event.input || '')).trim().toLowerCase();
  if (!arg || arg === 'menu' || arg === 'gui') {
    openFactionSelectionGUI(player, false);
    return;
  }
  assignPlayerPath(player, arg, false);
});

ServerEvents.basicPublicCommand('island_home', function(event) {
  var player = event.player;
  if (!player) return;
  var faction = getPlayerFaction(player);
  if (faction === 'none') {
    var neutral = ensureIsland(player.server, 'neutral');
    teleportToIsland(player, neutral);
    openFactionSelectionGUI(player, false);
    return;
  }
  var now = Date.now();
  var lastTp = player.persistentData.getLong('lastIslandHomeMs') || 0;
  if (now - lastTp < 300000 && !player.isOp()) {
    var leftSec = Math.ceil((300000 - (now - lastTp)) / 1000);
    player.tell(Text.of('§cПодождите ещё ' + leftSec + ' сек. перед повторным перемещением на маяк острова.'));
    return;
  }
  var homeKey = '' + (player.persistentData.getString('homeIsland') || (faction === 'mage' ? 'mage1' : 'tech1'));
  var island = ensureIsland(player.server, homeKey);
  player.persistentData.putLong('lastIslandHomeMs', now);
  teleportToIsland(player, island);
  player.tell(Text.of('§aПеремещение на ' + island.title + '...'));
});

ServerEvents.basicCommand('arcanum', function(event) {
  var raw = ('' + (event.input || '')).trim();
  var parts = raw ? raw.split(/\s+/) : ['status'];
  var sub = (parts[0] || 'status').toLowerCase();
  var server = event.level.server;
  var sender = event.player;

  // Вызывается сетевым пакетом кастомного полноэкранного UI (ArcanumUiMod) при клике по карточке острова
  if (sub === 'selfselect' && sender) {
    var picked = (parts[1] || '').toLowerCase();
    var canChange = sender.persistentData.getBoolean('allowFactionChange');
    if (canChange) {
      sender.persistentData.remove('allowFactionChange');
    }
    assignPlayerPath(sender, picked, canChange);
    return;
  }

  // Вызывается сетевым пакетом кастомного UI при нажатии горячей клавиши H
  if (sub === 'openui_self' && sender) {
    openFactionSelectionGUI(sender, false);
    return;
  }

  if (sub === 'check' || sub === 'whois') {
    var checkName = parts[1];
    var checkTarget = checkName ? server.getPlayer(checkName) : sender;
    if (!checkTarget) {
      listAllOnlineSides(sender || event, server);
      return;
    }
    inspectPlayerSide(sender || event, server, checkTarget);
    return;
  }

  if (sub === 'menu') {
    var menuName = parts[1];
    var menuTarget = menuName ? server.getPlayer(menuName) : sender;
    if (!menuTarget) {
      event.respond(Text.of('§cИгрок не найден в сети. Использование: /arcanum menu <ник>'));
      return;
    }
    openFactionSelectionGUI(menuTarget, true);
    menuTarget.tell(Text.of('§e✦ Оператор открыл вам меню выбора/смены Пути и Острова!'));
    event.respond(Text.of('§aИгроку ' + menuTarget.username + ' открыто меню выбора стороны.'));
    return;
  }

  if (sub === 'status') {
    var store = getIslandsStore(server);
    var counts = getIslandCounts(server);
    event.respond(Text.of('§b=== Arcanum & Machina: Статус Островов ==='));
    for (var i = 0; i < ISLAND_KEYS.length; i++) {
      var k = ISLAND_KEYS[i];
      var def = ISLAND_DEFS[k];
      if (store.contains(k)) {
        var s = store.getCompound(k);
        var pop = k === 'neutral' ? '-' : counts.getInt(k);
        event.respond(Text.of('§e' + k + '§7: ' + def.title + ' §f[' + s.getInt('x') + ', ' + s.getInt('y') + ', ' + s.getInt('z') + '] §8(' + s.getString('mode') + ', игроков: ' + pop + ')'));
      } else {
        event.respond(Text.of('§e' + k + '§7: ' + def.title + ' §8(ожидает инициализации около [' + def.targetX + ', ~' + def.baseY + ', ' + def.targetZ + '])'));
      }
    }
    return;
  }

  // Тест генерации всех 5 островов с консоли сервера
  if (sub === 'initall') {
    var ov = server.overworld();
    for (var j = 0; j < ISLAND_KEYS.length; j++) {
      var ik = ISLAND_KEYS[j];
      var isl = ensureIsland(server, ik);
      if (ov && isl) {
        var topAtCenter = getSolidTopY(ov, isl.x, isl.z);
        var bottomAtCenter = topAtCenter;
        for (var scanY = topAtCenter - 1; scanY >= -60; scanY--) {
          var stScan = ov.getBlockState(new MCBlockPos(isl.x, scanY, isl.z));
          if (!stScan.isAir()) bottomAtCenter = scanY;
        }
        var voidBottomAir = ov.getBlockState(new MCBlockPos(isl.x, -60, isl.z)).isAir();
        console.info('[Arcanum & Machina] METRICS ' + ik + ': pos=[' + isl.x + ',' + isl.y + ',' + isl.z + '] thickness=' + Math.max(0, topAtCenter - bottomAtCenter) + ' (bottomY=' + bottomAtCenter + ', topY=' + topAtCenter + ', voidClean=' + voidBottomAir + ')');
      }
    }
    console.info('[Arcanum & Machina] INITALL: все 5 островов успешно инициализированы!');
    event.respond(Text.of('§aВсе 5 островов инициализированы.'));
    return;
  }

  if (sub === 'tp' && sender) {
    var tpKey = (parts[1] || '').toLowerCase();
    if (!ISLAND_DEFS[tpKey]) {
      event.respond(Text.of('§cУкажите остров: neutral, mage1, mage2, tech1, tech2'));
      return;
    }
    var tpIsland = ensureIsland(server, tpKey);
    teleportToIsland(sender, tpIsland);
    event.respond(Text.of('§aТелепортация на ' + tpIsland.title + ' [' + tpIsland.x + ', ' + tpIsland.y + ', ' + tpIsland.z + ']'));
    return;
  }

  if (sub === 'setisland' && sender) {
    var setKey = (parts[1] || '').toLowerCase();
    if (!ISLAND_DEFS[setKey]) {
      event.respond(Text.of('§cУкажите остров: neutral, mage1, mage2, tech1, tech2'));
      return;
    }
    var updated = setCustomIslandPos(server, setKey, sender.x, sender.y, sender.z);
    event.respond(Text.of('§aТочка острова ' + updated.title + ' установлена на [' + updated.x + ', ' + updated.y + ', ' + updated.z + ']'));
    return;
  }

  if (sub === 'reset') {
    var targetName = parts[1];
    var target = targetName ? server.getPlayer(targetName) : sender;
    if (!target) {
      event.respond(Text.of('§cИгрок не найден в сети.'));
      return;
    }
    resetPlayerFactionState(server, target);
    event.respond(Text.of('§aВыбор стороны игрока ' + target.username + ' сброшен. Игрок возвращён на Нейтральный остров.'));
    return;
  }

  if (sub === 'setfaction' || sub === 'set') {
    var sfName = parts[1];
    var sfChoice = (parts[2] || '').toLowerCase();
    var sfTarget = server.getPlayer(sfName || '');
    if (!sfTarget || !sfChoice) {
      event.respond(Text.of('§cИспользование: /arcanum setfaction <ник> <mage|tech|mage1|mage2|tech1|tech2|menu|reset>'));
      return;
    }
    adminApplySideChange(sender || event, server, sfTarget, sfChoice);
    return;
  }

  if (sub === 'testlock' && sender) {
    if (sender.stages.has('enforce_in_creative')) {
      sender.stages.remove('enforce_in_creative');
      event.respond(Text.of('§eПроверка выброса предметов в Creative ВЫКЛЮЧЕНА.'));
    } else {
      sender.stages.add('enforce_in_creative');
      sweepPlayerInventory(sender);
      event.respond(Text.of('§aПроверка выброса предметов в Creative ВКЛЮЧЕНА.'));
    }
    return;
  }

  event.respond(Text.of('§eКоманды: /side [ник] | /sides | /sidemenu <ник> | /setside <ник> <mage|tech|mage1|mage2|tech1|tech2|reset> | /arcanum status | tp <key> | setisland <key>'));
});
