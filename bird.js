var THE_BIRD_RIGHT_URL = "https://hifi-public.s3.amazonaws.com/ozan/anim/the_bird/the_bird_right.fbx";

var roles = MyAvatar.getAnimationRoles();
var i, l = roles.length
print("getAnimationRoles()");
for (i = 0; i < l; i++) {
    print(roles[i]);
}

// replace point animations with the bird!
MyAvatar.overrideRoleAnimation("rightIndexPointOpen", THE_BIRD_RIGHT_URL, 30, false, 0, 12);
MyAvatar.overrideRoleAnimation("rightIndexPointOpen", THE_BIRD_RIGHT_URL, 30, false, 12, 12);
MyAvatar.overrideRoleAnimation("rightIndexPointOpen", THE_BIRD_RIGHT_URL, 30, false, 19, 30);

Script.scriptEnding.connect(function() {
    MyAvatar.restoreRoleAnimation("rightIndexPointOpen");
    MyAvatar.restoreRoleAnimation("rightIndexPointOpen");
    MyAvatar.restoreRoleAnimation("rightIndexPointOpen");
});
