var SolPubSub = function () {
    'use strict';
    var solPubSub = {};
    solPubSub.session = null;
    solPubSub.joinTopicName = 'dd/t/join';
    solPubSub.lobbyTopicName = 'dd/t/lobby';
    solPubSub.subscribed = false;

    // Logger
    solPubSub.log = function (line) {
        var now = new Date();
        var time = [('0' + now.getHours()).slice(-2), ('0' + now.getMinutes()).slice(-2),
            ('0' + now.getSeconds()).slice(-2)];
        var timestamp = '[' + time.join(':') + '] ';
        console.log(timestamp + line);
    };

    solPubSub.log('\n*** solPubSub to topic "' + solPubSub.joinTopicName + '" is ready to connect ***');

    // Establishes connection to Solace router
    solPubSub.connect = function () {
        // extract params
        if (solPubSub.session !== null) {
            solPubSub.log('Already connected and ready to subscribe.');
            return;
        }

        solPubSub.log('Connecting to Solace message router using url: ' + hostUrl);
        solPubSub.log('Client username: ' + username);
        solPubSub.log('Solace message router VPN name: ' + msgVpn);
        // create session
        try {
            solPubSub.session = solace.SolclientFactory.createSession({
                // solace.SessionProperties
                url:      hostUrl,
                vpnName:  msgVpn,
                userName: username,
                password: password,
            });
        } catch (error) {
            solPubSub.log(error.toString());
        }
        // define session event listeners
        solPubSub.session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
            solPubSub.log('=== Successfully connected and ready to subscribe. ===');
        });
        solPubSub.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, function (sessionEvent) {
            solPubSub.log('Connection failed to the message router: ' + sessionEvent.infoStr +
                ' - check correct parameter values and connectivity!');
        });
        solPubSub.session.on(solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
            solPubSub.log('Disconnected.');
            solPubSub.subscribed = false;
            if (solPubSub.session !== null) {
                solPubSub.session.dispose();
                solPubSub.session = null;
            }
        });
        solPubSub.session.on(solace.SessionEventCode.SUBSCRIPTION_ERROR, function (sessionEvent) {
            solPubSub.log('Cannot subscribe to topic: ' + sessionEvent.correlationKey);
        });
        solPubSub.session.on(solace.SessionEventCode.SUBSCRIPTION_OK, function (sessionEvent) {
            if (solPubSub.subscribed) {
                solPubSub.subscribed = false;
                solPubSub.log('Successfully unsubscribed from topic: ' + sessionEvent.correlationKey);
            } else {
                solPubSub.subscribed = true;
                solPubSub.log('Successfully subscribed to topic: ' + sessionEvent.correlationKey);
                solPubSub.log('=== Ready to receive messages. ===');
            }
        });
        // define message event listener
        solPubSub.session.on(solace.SessionEventCode.MESSAGE, function (message) {
            solPubSub.log('Received message: "' + message.getBinaryAttachment() + '", details:\n' +
                message.dump());
            let joiner = message.getBinaryAttachment();
            players.push(joiner);
        });

        solPubSub.connectToSolace();
    };

    // Actually connects the session triggered when the iframe has been loaded - see in html code
    solPubSub.connectToSolace = function () {
        try {
            solPubSub.session.connect();
        } catch (error) {
            solPubSub.log(error.toString());
        }
    };

    // Subscribes to topic on Solace message router
    solPubSub.subscribe = function () {
        if (solPubSub.session !== null) {
            if (solPubSub.subscribed) {
                solPubSub.log('Already subscribed to "' + solPubSub.joinTopicName
                    + '" and ready to receive messages.');
            } else {
                solPubSub.log('Subscribing to topic: ' + solPubSub.joinTopicName);
                try {
                    solPubSub.session.subscribe(
                        solace.SolclientFactory.createTopicDestination(solPubSub.joinTopicName),
                        true, // generate confirmation when subscription is added successfully
                        solPubSub.joinTopicName, // use topic name as correlation key
                        10000 // 10 seconds timeout for this operation
                    );
                } catch (error) {
                    solPubSub.log(error.toString());
                }
            }
        } else {
            solPubSub.log('Cannot subscribe because not connected to Solace message router.');
        }
    };

    // Unsubscribes from topic on Solace message router
    solPubSub.unsubscribe = function () {
        if (solPubSub.session !== null) {
            if (solPubSub.subscribed) {
                solPubSub.log('Unsubscribing from topic: ' + solPubSub.joinTopicName);
                try {
                    solPubSub.session.unsubscribe(
                        solace.SolclientFactory.createTopicDestination(solPubSub.joinTopicName),
                        true, // generate confirmation when subscription is removed successfully
                        solPubSub.joinTopicName, // use topic name as correlation key
                        10000 // 10 seconds timeout for this operation
                    );
                } catch (error) {
                    solPubSub.log(error.toString());
                }
            } else {
                solPubSub.log('Cannot unsubscribe because not subscribed to the topic "'
                    + solPubSub.joinTopicName + '"');
            }
        } else {
            solPubSub.log('Cannot unsubscribe because not connected to Solace message router.');
        }
    };

    // Gracefully disconnects from Solace message router
    solPubSub.disconnect = function () {
        solPubSub.log('Disconnecting from Solace message router...');
        if (solPubSub.session !== null) {
            try {
                solPubSub.session.disconnect();
            } catch (error) {
                solPubSub.log(error.toString());
            }
        } else {
            solPubSub.log('Not connected to Solace message router.');
        }
    };

    return solPubSub;
};