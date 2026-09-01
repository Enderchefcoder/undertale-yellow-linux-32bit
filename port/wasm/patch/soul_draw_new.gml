if (live_call())
{
    return global.live_result;
}
if (surface_exists(global.attack_surface))
{
    surface_set_target(global.attack_surface);
    // === SOULBOX ZOOM (small-screen mod) ===
    // Draw the soul up to 1.45x larger while the attack camera is zoomed.
    // Visual only: the hitbox, world position and collision are unchanged, so
    // dodging is unchanged but the soul is much easier to track on a 320x240
    // display. The sprite is scaled around its center to stay on the hitbox.
    var scl = 1;
    if (variable_global_exists("battle_zoom_amount"))
    {
        scl = 1 + (0.45 * global.battle_zoom_amount);
    }
    var w = sprite_get_width(spr_human_down);
    var h = sprite_get_height(spr_human_down);
    var ox = sprite_get_xoffset(spr_human_down);
    var oy = sprite_get_yoffset(spr_human_down);
    draw_sprite_ext(spr_human_down, 0, round(x) + ((ox - (w * 0.5)) * scl), round(y + y_offset) + ((oy - (h * 0.5)) * scl), image_xscale * scl, image_yscale * scl, image_angle, soul_color, human_alpha);
    var w2 = sprite_get_width(sprite_index);
    var h2 = sprite_get_height(sprite_index);
    var ox2 = sprite_get_xoffset(sprite_index);
    var oy2 = sprite_get_yoffset(sprite_index);
    draw_sprite_ext(sprite_index, image_index, round(x) + ((ox2 - (w2 * 0.5)) * scl), round(y + y_offset) + ((oy2 - (h2 * 0.5)) * scl), image_xscale * scl, image_yscale * scl, image_angle, soul_color, image_alpha);
    surface_reset_target();
}
