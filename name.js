"use strict";

/*jslint vars: true, plusplus: true*/
/*global Entities, Script, Quat, Vec3, MyAvatar, print*/
// nameTag.js
//
// Created by Triplelexx on 17/01/31
// Copyright 2017 High Fidelity, Inc.
//
// Running the script creates a text entity that will hover over the user's head showing their display name.
//
// Distributed under the Apache License, Version 2.0.
// See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
(function(){


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

    function log(describer, obj) {
        obj = obj || '';
        print('&======');
        print(describer);
        print(JSON.stringify(obj));
        print('======&');
    }

    var NameDisplayController = {
        nameGroup: [],
        deleteName: function(name){
            var index;
            for(var i = 0; i < this.nameGroup.length; i++){
                index = this.nameGroup.indexOf(name);
                this.nameGroup.splice(index,1);
                break;
            }
        },
        deleteIndex: function(index){
            this.nameGroup.splice(index,1);
        },
        addName: function(avatar, id, name, index, description){
            var index = this.nameGroup.length;
            var newNameGroupMember = new NameDisplayMaker(avatar, id, name, index, description);
            // log("newNameGroupMember", newNameGroupMember)
            this.nameGroup.push(newNameGroupMember);
            // log("nameGroup", this.nameGroup)
        },
    };

    function NameDisplayMaker(avatar, id, name, index, description) {
        this.nameTagEntityID = Uuid.Null;
        this.lastCheckForEntity = 0;
        this.avatar = avatar;
        this.id = id;
        this.name = name + id;
        this.index = index;
        this.description = description;
    }
    NameDisplayMaker.prototype.addNameTag = function() {
        var headIndex = this.avatar.getJointIndex("Head");
        var jT = this.avatar.getJointTranslations(headIndex)[2];
        log("this.avatar.scale", this.avatar.scale);
        var newPosition = this.avatar.position
        newPosition.y = newPosition.y * this.avatar.scale;
        var neckPosition = Vec3.sum(jT, newPosition);
        log("joint", jT);
        log("neckPosition", neckPosition);

        // for( var key in this.avatar) { print(JSON.stringify(key + ":" + this.avatar))}
        var nameTagPosition = Vec3.sum(neckPosition, Vec3.multiply(HEAD_OFFSET, Quat.getForward(this.avatar.orientation)));
        nameTagPosition.y += HEIGHT_ABOVE_HEAD;
        var nameTagProperties = {
            name: this.avatar.displayName + ' Name Tag',
            type: 'Text',
            text: this.avatar.displayName + "\n" + this.description,
            lineHeight: LINE_HEIGHT,
            parentID: this.avatar.sessionUUID,
            dimensions: this.dimensionsFromName(),
            position: nameTagPosition,
        }
        nameTagEntityID = Entities.addEntity(nameTagProperties, CLIENTONLY);
    }
    NameDisplayMaker.prototype.updateNameTag = function() {
        var nameTagProps = Entities.getEntityProperties(this.nameTagEntityID);
        var nameTagPosition = Vec3.sum(this.avatar.getHeadPosition(), Vec3.multiply(HEAD_OFFSET, Quat.getForward(this.avatar.orientation)));
        nameTagPosition.y += HEIGHT_ABOVE_HEAD;

        Entities.editEntity(this.nameTagEntityID, {
            position: this.nameTagPosition,
            dimensions: this.dimensionsFromName(),
            // lifetime is in seconds we add TTL on top of the next poll time
            lifetime: Math.round(nameTagProps.age) + (ENTITY_CHECK_INTERVAL / 1000) + TTL,
            text: this.avatar.displayName
        });
    };
    NameDisplayMaker.prototype.deleteNameTag = function() {
        if(this.nameTagEntityID !== Uuid.NULL) {
            Entities.deleteEntity(this.nameTagEntityID);
            this.nameTagEntityID = Uuid.NULL;
        }
    }
    NameDisplayMaker.prototype.dimensionsFromName = function() {
        return {
            x: LETTER_OFFSET * this.avatar.displayName.length,
            y: SIZE_Y,
            z: 0.0
        }
    };
    NameDisplayMaker.prototype.checkForEntity = function() {
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
    NameDisplayMaker.prototype.update = function() {
        // if no entity we return
        if(this.nameTagEntityID == Uuid.NULL) {
            return;
        }

        if(Date.now() - this.lastCheckForEntity > ENTITY_CHECK_INTERVAL) {
            this.checkForEntity();
            this.lastCheckForEntity = Date.now();
        }
    }
    NameDisplayMaker.prototype.cleanup = function() {
        this.deleteNameTag();
    }
    NameDisplayMaker.prototype.setup = function() {
        var self = this;
        // create the name tag entity after a brief delay
        Script.setTimeout(function() {
            self.addNameTag();
        }, STARTUP_DELAY);
        Script.update.connect(this.update);
    }
    NameDisplayMaker.prototype.tearDown = function() {
        Script.scriptEnding.connect(this.cleanup);

    }

    function getAvatars(){

    }

    function onAvatarCheckInterval(){

    }

    function onAvatarAddedEvent(id){
        var grabbedAvatar = AvatarList.getAvatar(id);
        Script.require('./request.js').request('https://highfidelity.com/users/miladn', function(error, response) {
            var regex = /meta content=\"(.*)\" property=\"og:description\" /;
            var description = response.match(regex)[0].split("<")[1].split("\"")[1];
            log("response", description);
            index = NameDisplayController.nameGroup.length;
            NameDisplayController.addName(grabbedAvatar, grabbedAvatar.id, grabbedAvatar.displayName, index, description);
            log("turning On all current Tags")
            NameDisplayController.nameGroup[index].setup();
        })

        Script.require('./request.js').request('https://highfidelity.com/api/v1/users?status="49bc6b85-7b29-4333-b610-a818e6c71d8a"', function(error, response) {
            log("response from server", response);
            log("error", error);


        })
    }

    function onAvatarRemovedEvent(){

    }

    function turnOnAllCurrentTags(){
        for (var i = 0 ; i < NameDisplayController.nameGroup.length; i++){
            log("turning on:", NameDisplayController.nameGroup[i].name );
            NameDisplayController.nameGroup[i].setup();
        }

    }

    function setup(){
        avatarCheckInterval = Script.setInterval(onAvatarCheckInterval, CHECK_FOR_ENTETIES_INTERVAL);

        currentAvatarList = AvatarList.getAvatarIdentifiers()
        log("currentAvatarLists", currentAvatarList);
        for (var i = 0; i < currentAvatarList.length; i++) {
            var currentAvatar = currentAvatarList[i];
            var grabbedAvatar = AvatarList.getAvatar(currentAvatar);
            // log("grabbedAvatar", grabbedAvatar);
            log("grabbedAvatar.id", grabbedAvatar.sessionUUID);
            log("Agent.sessionUUID", Agent.sessionUUID);

            if( grabbedAvatar.sessionUUID !== Agent.sessionUUID){
                Script.require('./request.js').request('https://highfidelity.com/users/miladn', function(error, response) {
                    var regex = /meta content=\"(.*)\" property=\"og:description\" /;
                    var description = response.match(regex)[0].split("<")[1].split("\"")[1];
                    log("response", description);
                    NameDisplayController.addName(grabbedAvatar, grabbedAvatar.id, grabbedAvatar.displayName, i, description);
                    log("turning On all current Tags")
                    turnOnAllCurrentTags();
                })
            }


        }

        AvatarList.avatarAddedEvent.connect(onAvatarAddedEvent);
        AvatarList.avatarAddedEvent.connect(onAvatarRemovedEvent);


    }

    function tearDown(){
        Script.clearInterval(avatarCheckInterval);
        AvatarList.avatarAddedEvent.disconnect(onAvatarAddedEvent);
        AvatarList.avatarAddedEvent.disconnect(onAvatarRemovedEvent);
    }

    Script.setTimeout(setup, STARTUP_DELAY * 1.5);

    Script.scriptEnding.connect(tearDown);
}());
