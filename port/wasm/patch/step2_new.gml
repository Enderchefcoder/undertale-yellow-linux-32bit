if (global.current_hp_self < 0)
{
    global.current_hp_self = 0;
}
var enemy_count = global.enemy_count;
if (global.current_hp_enemy < 0)
{
    global.current_hp_enemy = 0;
}
else if (enemy_count >= 2)
{
    if (global.current_hp_enemy_2 < 0)
    {
        global.current_hp_enemy_2 = 0;
    }
}
else if (enemy_count >= 3)
{
    if (global.current_hp_enemy_3 < 0)
    {
        global.current_hp_enemy_3 = 0;
    }
}
if (global.current_pp_self > global.max_pp_self)
{
    global.current_pp_self = global.max_pp_self;
}
if (global.current_pp_self < 0)
{
    global.current_pp_self = 0;
}
if (global.current_sp_self > global.max_sp_self)
{
    global.current_sp_self = global.max_sp_self;
}
if (global.current_sp_self < 0)
{
    global.current_sp_self = 0;
}
if (instance_exists(obj_dialogue_box_battle_transformation_any) && obj_heart_battle_fighting_parent.moveable == true && global.image_alpha_enemy_attacking_immunity == false)
{
    if (global.image_alpha_enemy_attacking > 0.5)
    {
        global.image_alpha_enemy_attacking -= 0.05;
        if (global.image_alpha_enemy_attacking <= 0.5)
        {
            global.image_alpha_enemy_attacking = 0.5;
        }
    }
}
else if (global.image_alpha_enemy_attacking < 1)
{
    global.image_alpha_enemy_attacking += 0.05;
    if (global.image_alpha_enemy_attacking >= 1)
    {
        global.image_alpha_enemy_attacking = 1;
    }
}
if (audio_extend == true)
{
    if (!audio_is_playing(audio_initial_music))
    {
        audio_sound_gain(audio_extend_music, 0.8, 0);
        audio_play_sound(audio_extend_music, 20, true);
        audio_extend = false;
    }
}
// === SOULBOX ZOOM (small-screen mod) ===
// While the enemy attacks, the battle camera zooms into the arena so the soul
// box and monster are larger on small screens. Purely visual: object positions
// and collisions are untouched. Eases in/out with the attack box.
if (!variable_global_exists("battle_zoom_amount"))
{
    global.battle_zoom_amount = 0;
}
var zoom_target = instance_exists(obj_dialogue_box_battle_transformation_any) ? 1 : 0;
global.battle_zoom_amount += clamp(zoom_target - global.battle_zoom_amount, -0.06, 0.06);
var zoom_amount = global.battle_zoom_amount;
if (zoom_amount > 0.01)
{
    var zoom_box = obj_dialogue_box_battle_transformation_any;
    var zoom_box_width = 0;
    if (instance_exists(zoom_box))
    {
        zoom_box_width = (zoom_box.sprite_width * zoom_box.image_xscale) - 8;
    }
    // Clamp so the soul movement area never leaves the screen; standard battle
    // boxes (567px interior) cap out at 1.11x of the 640px view.
    var zoom = clamp(640 / max(zoom_box_width, 320), 1, 1.11);
    var zoom_view_w = 640 / zoom;
    var zoom_view_h = 480 / zoom;
    var zoom_center_x = 319.5;
    var zoom_center_y = lerp(240, 244.8, zoom_amount);
    view_xview[0] = zoom_center_x - (zoom_view_w * 0.5);
    view_yview[0] = zoom_center_y - (zoom_view_h * 0.5);
    view_wview[0] = zoom_view_w;
    view_hview[0] = zoom_view_h;
}
else
{
    view_xview[0] = 0;
    view_yview[0] = 0;
    view_wview[0] = 640;
    view_hview[0] = 480;
}
