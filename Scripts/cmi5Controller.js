﻿var cmi5Controller = (function () {

    // **********************
    // Private variables
    // **********************
    var jq = $;         // Local copy of jquery ($)
    var stmt_;
    var Agent_;
    var endPointConfig;
    var contextActivities;
    var contextExtensions;
    var contextTemplate;
     
    // **********************
    // Public properties    
    // **********************
    this.endPoint = "";
    this.fetchUrl = "";
    this.registration = "";
    this.activityId = "";
    this.actor = "";
    this.authToken = "";
     
    // State parameters (NEW)
    this.sessionId = "";
    this.masteryScore = 0;
    this.launchMode = "";
    this.launchMethod = "";
    this.publisherId = "";
    this.moveOn = "";
    this.launchParameters = "";
    this.returnURL = "";
    this.entitlementKey = { "courseStructure": "", "alternate": "" };

    // **********************
    // Private functions
    // **********************
    function GetBasicStatement(agent_, verb_, object_) {
        Agent_ = new ADL.XAPIStatement.Agent(agent_);

        var s = new ADL.XAPIStatement(
            Agent_,
            verb_,
            object_
        );

        s.generateId();
        return s;
    }
     
    function SetConfig() {  
        // Set LRS endpoint configuration
        endPointConfig = {
            "endpoint": cmi5Controller.endPoint,
            "auth": "Basic " + cmi5Controller.authToken
        };
    }

    function setStateDocument(r) { 
        
        // This is the callback method referenced in call to cmi5Controller.getStateDocument()
        var obj = JSON.parse(r.response);
    
        // Get context activities
        contextTemplate = obj.contextTemplate;
        contextActivities = obj.contextTemplate.contextActivities;

        // Get context extensions
        contextExtensions = obj.contextTemplate.extensions;

        // Get returnUrl
        var t = typeof (obj["returnURL"]);
        if (t === "string") {
            cmi5Controller.returnURL = obj["returnURL"];
        }

        // Get other state properties
        cmi5Controller.moveOn = obj["moveOn"];
        cmi5Controller.masteryScore = obj["masteryScore"];
        cmi5Controller.launchMode = obj["launchMode"];
        cmi5Controller.launchMethod = obj["launchMethod"];
        cmi5Controller.sessionId = contextExtensions["https://w3id.org/xapi/cmi5/context/extensions/sessionid"];
        cmi5Controller.publisherId = contextActivities.grouping[0].id;
        cmi5Controller.launchParameters = obj["launchParameters"];
        cmi5Controller.entitlementKey = obj["entitlementKey"];
    }

    // **********************
    // Public functions
    // **********************
    return {
        // cmi5 controller initialization
        startUp: function(callBack, errorCallBack) {                        
            cmi5Controller.getAuthToken(errorCallBack);
            Agent_ = new ADL.XAPIStatement.Agent(cmi5Controller.actor);
            cmi5Controller.getStateDocument(setStateDocument);
            // more to come...
        },
        // getAuthToken calls the fetch url to get the authorization token
        getAuthToken: function (tokenErrorCallBack) {
            jq.support.cors = true;
            jq.ajax({
                async: true,
                url: cmi5Controller.fetchUrl,
                type: "POST",
                dataType: "json"
            })
            .done(function (data) {
                // Check for error
                var e = typeof (data["error-code"]);
                if (e === "string") {
                    console.log("getAuthToken: error-code " + data["error-code"] + ": " + data["error-text"]);
                    if (tokenErrorCallBack && typeof tokenErrorCallBack === "function") { 
                        tokenErrorCallBack("");                                           
                    }
                }
                e = typeof (data["auth-token"]);
                if (e == "string") {
                    cmi5Controller.authToken = data["auth-token"];        
                    SetConfig(data["auth-token"]);                        
                } else {
                    console.log("getAuthToken: Invalid structure returned: " + data.toString());
                    if (tokenErrorCallBack && typeof tokenErrorCallBack === "function") {
                        tokenErrorCallBack("");
                    }
                }
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                tokenErrorCallBack(errorThrown);
            });
        },
        getAgentProfile: function (endPointConfig, agent, callback) {
            ADL.XAPIWrapper.changeConfig(endPointConfig);

            ADL.XAPIWrapper.getAgentProfile(jq.parseJSON(agent), "cmi5LearnerPreferences", null, callback);
            return false;
        },
        getStateDocument: function (endPointConfig_, activityId_, agent_, registration_, callback_) {
            ADL.XAPIWrapper.changeConfig(endPointConfig_);
            ADL.XAPIWrapper.getState(cmi5Controller.activityId, Agent_, "LMS.LaunchData", cmi5Controller.registration, null, callback_);
        },
        getcmi5AllowedStatement: function (agent_, verb_, object_, registration_, contextActivities_, contextExtensions_) {
            stmt_ = GetBasicStatement(agent_, verb_, object_);

            // Add registration
            stmt_.context = {};
            stmt_.context.registration = registration_;

            // Context activities from State API
            var z = contextActivities_;
            if (z.hasOwnProperty("category")) {
                delete z.category;
            }
            stmt_.context.contextActivities = z;

            // Extensions
            stmt_.context.extensions = contextExtensions_;

            return stmt_;
        },
        getcmi5DefinedStatement: function (agent_, verb_, object_, registration_, contextActivities_, contextExtensions_) {
            stmt_ = GetBasicStatement(agent_, verb_, object_);

            // Add registration
            stmt_.context = {};
            stmt_.context.registration = registration_;

            // Context activities from State API
            var z = contextActivities_;
            stmt_.context.contextActivities = z;

            // cmi5 Context activity
            stmt_.context.contextActivities.category = [];
            stmt_.context.contextActivities.category.push(
            {
                "id": "https://w3id.org/xapi/cmi5/context/categories/cmi5"
            });

            // Extensions
            stmt_.context.extensions = contextExtensions_;

            return stmt_;
        },
        sendStatement: function (endPointConfig_, statement_, callback_) {
            ADL.XAPIWrapper.changeConfig(endPointConfig);
            ADL.XAPIWrapper.sendStatement(statement_, callback_);
        }
    };
})();
