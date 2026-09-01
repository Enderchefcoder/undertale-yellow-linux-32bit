// === TEMP VERIFICATION (remove for release) ===
// Drop straight into a Froggit battle for headless screenshot verification.
show_debug_message("UTY-PATCH: intro check running in room " + room_get_name(room));
global.game_mode = "yellow";
global.battle_enemy_name = "froggit intro";
global.player_name = "Clover";
global.player_character = 0;
global.max_hp_self = 20;
global.current_hp_self = 20;
global.max_pp_self = 24;
global.current_pp_self = 24;
global.max_sp_self = 24;
global.current_sp_self = 24;
global.player_invulnerability = 0;
show_debug_message("UTY-PATCH: forcing battle for " + global.battle_enemy_name);
var battle_enemy_name = global.battle_enemy_name;
if (global.game_mode == "customs")
{
    if (!instance_exists(obj_battle_generator))
    {
        instance_create(0, 0, obj_battle_generator);
    }
    instance_destroy();
}
else if (global.game_mode == "yellow")
{
    if (battle_enemy_name == "decibat")
    {
        script_execute(scr_generate_battle_decibat_intro);
    }
    else
    {
        if (!instance_exists(obj_battle_generator))
        {
            instance_create(0, 0, obj_battle_generator);
        }
        instance_destroy();
    }
}
