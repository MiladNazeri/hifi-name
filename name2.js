"use strict";

/*jslint vars: true, plusplus: true*/
/*global Entities, Script, Quat, Vec3, MyAvatar, print*/
// nameTag.js
//
// Created by Triplelexx on 17/01/31
// Modified by Milad Nazeri on 01/21/18
// Copyright 2017 High Fidelity, Inc.
//
// Running the script creates a text entity that will hover over the user's head showing their display name.
//
// Distributed under the Apache License, Version 2.0.
// See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
const CLIENTONLY = false;
const ENTITY_CHECK_INTERVAL = 5000; // ms = 5 seconds
const STARTUP_DELAY = 5000; // ms = 2 second
const OLD_AGE = 3500; // we recreate the entity if older than this time in seconds
const TTL = 2; // time to live in seconds if script is not running
const HEIGHT_ABOVE_HEAD = 0.05;
const HEAD_OFFSET = -0.025;
const SIZE_Y = 0.075;
const LETTER_OFFSET = 0.03; // arbitrary value to dynamically change width, could be more accurate by detecting characters
const LINE_HEIGHT = 0.05;
const CHECK_FOR_ENTETIES_INTERVAL = 5000;
var avatarCheckInterval;
var currentAvatarList;
var grabbedAvatarList;

Agent.isAvatar = true;
Avatar.skeletonModelURL = "http://hifi-content.s3.amazonaws.com/ozan/dev/avatars/invisible_avatar/invisible_avatar.fst";

function log(describer, obj) {
    obj = obj || '';
    print('&======');
    print(describer);
    print(JSON.stringify(obj));
    print('======&');
}


var NameDisplayController = {
    nameGroup: {},
    deleteName: function(id){
        if (this.nameGroup[id]) {
            log("deleting Name ", id)
            this.nameGroup[id].tearDown();
            delete this.nameGroup[id];
        }
    },
    addName: function(avatar, id, name){
        //var argumentsArray = Array.prototype.slice.call(arguments)
        //for(var i = 0; i < argumentsArray .length; i++){
        //    log("add name: argumentsArray[i]", argumentsArray[i])
        //}
        var newNameGroupMember;

        if (!this.nameGroup[id]) {
            log("Adding Name ", id)
            newNameGroupMember = new NameDisplayMaker(avatar, id, name);
            this.nameGroup[id] = newNameGroupMember;
            this.nameGroup[id].setup();
        }
    }
};



function NameDisplayMaker(avatar, id, name) {
    this.nameTagEntityID = Uuid.Null;
    this.lastCheckForEntity = 0;
    this.avatar = avatar;
    this.id = id;
    this.name = name;
    this.addNameTag = function(){
        log("Adding Name Tag");
        var headIndex = this.avatar.getJointIndex("Head");
        var jT = this.avatar.getJointTranslations(headIndex)[2];
        var newPosition = this.avatar.position
        // newPosition.y = newPosition.y * this.avatar.scale;
        var neckPosition = Vec3.sum(jT, newPosition);
        log("newPosition", newPosition);
        log("joint", jT);
        log("neckPosition", neckPosition);
        log("this.avatar.scale", this.avatar.scale);

        // for( var key in this.avatar) { print(JSON.stringify(key + ":" + this.avatar))}
        var nameTagPosition = Vec3.sum(neckPosition, Vec3.multiply(HEAD_OFFSET, Quat.getForward(this.avatar.orientation)));
        nameTagPosition.y += HEIGHT_ABOVE_HEAD;
        var nameTagProperties = {
            name: this.avatar.displayName + ' Name Tag',
            type: 'Text',
            text: this.avatar.displayName,
            lineHeight: LINE_HEIGHT,
            parentID: this.avatar.sessionUUID,
            dimensions: this.dimensionsFromName(),
            position: nameTagPosition,
        }
        this.nameTagEntityID = Entities.addEntity(nameTagProperties, CLIENTONLY);
        log("Added Name tag" + this.nameTagEntityID);
    }
    this.updateNameTag = function(){
        log("Updating Name Tag " + this.nameTagEntityID);
        var nameTagProps = Entities.getEntityProperties(this.nameTagEntityID);

        var headIndex = this.avatar.getJointIndex("Head");
        var jT = this.avatar.getJointTranslations(headIndex)[2];

        var newPosition = this.avatar.position
        newPosition.y = newPosition.y * this.avatar.scale;
        var neckPosition = Vec3.sum(jT, newPosition);

        var nameTagPosition = Vec3.sum(this.avatar.getHeadPosition(), Vec3.multiply(HEAD_OFFSET, Quat.getForward(this.avatar.orientation)));

        Entities.editEntity(this.nameTagEntityID, {
            position: nameTagPosition,
            dimensions: this.dimensionsFromName(),
            // lifetime is in seconds we add TTL on top of the next poll time
            lifetime: Math.round(nameTagProps.age) + (ENTITY_CHECK_INTERVAL / 1000) + TTL,
            text: this.avatar.displayName
        });
    }
    this.deleteNameTag = function(){
        log("Deleting Name Tag call");
        if(this.nameTagEntityID !== Uuid.NULL) {
            log("Deleting Name Tag");
            Entities.deleteEntity(this.nameTagEntityID);
            this.nameTagEntityID = Uuid.NULL;
        }
    }
    this.dimensionsFromName = function(){
        return {
            x: LETTER_OFFSET * this.avatar.displayName.length,
            y: SIZE_Y,
            z: 0.0
        }
    }
    this.checkForEntity = function(){
        log("this", this);
        for( var key in this) { print(JSON.stringify(key + ":" + this))}
        log("checking for name tag entity " + this.nameTagEntityID);
        var nameTagProps = Entities.getEntityProperties(this.nameTagEntityID);
        // it is possible for the age to not be a valid number, we check for this and return accordingly
        if(nameTagProps.age == -1) {
            return;
        }

        // it's too old or we receive undefined make a new one, otherwise update
        if(nameTagProps.age > OLD_AGE || nameTagProps.age == undefined) {
            this.deleteNameTag();
            this.addNameTag();
        } else {
            this.updateNameTag();
        }
    }
    this.update = function(){
        // for( var key in this) { print(JSON.stringify(key + ":" + this))}
        // if no entity we return
        if(this.nameTagEntityID == Uuid.NULL) {
            return;
        }
        log("Date.now()", Date.now());
        log("this.lastCheckForEntity", this.lastCheckForEntity);
        log("ENTITY_CHECK_INTERVAL", ENTITY_CHECK_INTERVAL);

        if(Date.now() - this.lastCheckForEntity > ENTITY_CHECK_INTERVAL) {
            this.checkForEntity();
            this.lastCheckForEntity = Date.now();
        }
    }
    this.cleanup = function(){
        this.deleteNameTag();
        NameDisplayController.deleteName(this.id);
        script.update.disconnect(this.update);
    }
    this.setup = function(){
        log("Running NameDisplayMaker Setup");
        // log("this", this);
        // for( var key in this) { print(JSON.stringify(key + ":" + this))}
        var self = this;
        // create the name tag entity after a brief delay
        Script.setTimeout(function() {
            self.addNameTag();
        }, STARTUP_DELAY);
        Script.update.connect(this.update.bind(self));
    }
    this.tearDown = function(){
        Script.scriptEnding.connect(this.cleanup);
    }
}

function onAvatarCheckInterval(){
    currentAvatarList = AvatarList.getAvatarIdentifiers();
    // log("currentAvatarLists", currentAvatarList);
    for (var i = 0; i < currentAvatarList.length; i++) {
        var currentAvatar = currentAvatarList[i];
        var grabbedAvatar = AvatarList.getAvatar(currentAvatar);
        // log("grabbedAvatar.id", grabbedAvatar.sessionUUID);
        // log("Agent.sessionUUID", Agent.sessionUUID);

        if( grabbedAvatar.sessionUUID !== Agent.sessionUUID){
            NameDisplayController.addName(grabbedAvatar, grabbedAvatar.sessionUUID, grabbedAvatar.displayName);
            //turnOnAllCurrentTags();
        }
    }
}

/*
function onAvatarSessionChangedEvent(id){
    log("Avatarsessionchanged");
}

function onAvatarAddedEvent(id){
    log("avatarAdded", id);
    try {
        var grabbedAvatar = AvatarList.getAvatar(id);
    } catch(e) {
        log("error", e);
    }

    log("grabbedAvatar", grabbedAvatar);
    log("grabbedAvatar.id", grabbedAvatar.id);
    log("grabbedAvatar.displayName", grabbedAvatar.displayName);

    NameDisplayController.addName(grabbedAvatar, grabbedAvatar.id, grabbedAvatar.displayName);

}

function onAvatarRemovedEvent(id){
    log("avatar removed", id);
    NameDisplayController.deleteName(id);

}
*/

function setup(){
    log("Running Setup");
    log("V8");
    avatarCheckInterval = Script.setInterval(onAvatarCheckInterval, ENTITY_CHECK_INTERVAL);
    //AvatarList.avatarAddedEvent.connect(onAvatarAddedEvent);
    //AvatarList.avatarRemovedEvent.connect(onAvatarRemovedEvent);
    //AvatarList.avatarSessionChangedEvent.connect(onAvatarSessionChangedEvent);
}

function tearDown(){
    log("Running TearDown");
    Script.clearInterval(avatarCheckInterval);
    //AvatarList.avatarAddedEvent.disconnect(onAvatarAddedEvent);
    //AvatarList.avatarRemovedEvent.disconnect(onAvatarRemovedEvent);
    //AvatarList.avatarSessionChangedEvent.disconnect(onAvatarSessionChangedEvent);
}

Script.setTimeout(setup, STARTUP_DELAY * 1.5);

Script.scriptEnding.connect(tearDown);
