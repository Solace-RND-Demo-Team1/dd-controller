var TopicSubscriber = function (topicName) {
    'use strict';
    var subscriber = {};
    subscriber.session = null;
    subscriber.topicName = topicName;
    subscriber.subscribed = false;

    // Logger
    subscriber.log = function (line) {
        var now = new Date();
        var time = [('0' + now.getHours()).slice(-2), ('0' + now.getMinutes()).slice(-2),
            ('0' + now.getSeconds()).slice(-2)];
        var timestamp = '[' + time.join(':') + '] ';
        console.log(timestamp + line);
    };

    subscriber.log('\n*** Subscriber to topic "' + subscriber.topicName + '" is ready to connect ***');

    // Establishes connection to Solace router
    subscriber.connect = function () {
        // extract params
        if (subscriber.session !== null) {
            subscriber.log('Already connected and ready to subscribe.');
            return;
        }

        subscriber.log('Connecting to Solace message router using url: ' + hostUrl);
        subscriber.log('Client username: ' + username);
        subscriber.log('Solace message router VPN name: ' + msgVpn);
        // create session
        try {
            subscriber.session = solace.SolclientFactory.createSession({
                // solace.SessionProperties
                url:      hostUrl,
                vpnName:  msgVpn,
                userName: username,
                password: password,
            });
        } catch (error) {
            subscriber.log(error.toString());
        }
        // define session event listeners
        subscriber.session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
            subscriber.log('=== Successfully connected and ready to subscribe. ===');
        });
        subscriber.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, function (sessionEvent) {
            subscriber.log('Connection failed to the message router: ' + sessionEvent.infoStr +
                ' - check correct parameter values and connectivity!');
        });
        subscriber.session.on(solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
            subscriber.log('Disconnected.');
            subscriber.subscribed = false;
            if (subscriber.session !== null) {
                subscriber.session.dispose();
                subscriber.session = null;
            }
        });
        subscriber.session.on(solace.SessionEventCode.SUBSCRIPTION_ERROR, function (sessionEvent) {
            subscriber.log('Cannot subscribe to topic: ' + sessionEvent.correlationKey);
        });
        subscriber.session.on(solace.SessionEventCode.SUBSCRIPTION_OK, function (sessionEvent) {
            if (subscriber.subscribed) {
                subscriber.subscribed = false;
                subscriber.log('Successfully unsubscribed from topic: ' + sessionEvent.correlationKey);
            } else {
                subscriber.subscribed = true;
                subscriber.log('Successfully subscribed to topic: ' + sessionEvent.correlationKey);
                subscriber.log('=== Ready to receive messages. ===');
            }
        });
        // define message event listener
        subscriber.session.on(solace.SessionEventCode.MESSAGE, function (message) {
            subscriber.log('Received message: "' + message.getBinaryAttachment() + '", details:\n' +
                message.dump());
            let joiner = message.getBinaryAttachment();
            players.push(joiner);
        });

        subscriber.connectToSolace();
    };

    // Actually connects the session triggered when the iframe has been loaded - see in html code
    subscriber.connectToSolace = function () {
        try {
            subscriber.session.connect();
        } catch (error) {
            subscriber.log(error.toString());
        }
    };

    // Subscribes to topic on Solace message router
    subscriber.subscribe = function () {
        if (subscriber.session !== null) {
            if (subscriber.subscribed) {
                subscriber.log('Already subscribed to "' + subscriber.topicName
                    + '" and ready to receive messages.');
            } else {
                subscriber.log('Subscribing to topic: ' + subscriber.topicName);
                try {
                    subscriber.session.subscribe(
                        solace.SolclientFactory.createTopicDestination(subscriber.topicName),
                        true, // generate confirmation when subscription is added successfully
                        subscriber.topicName, // use topic name as correlation key
                        10000 // 10 seconds timeout for this operation
                    );
                } catch (error) {
                    subscriber.log(error.toString());
                }
            }
        } else {
            subscriber.log('Cannot subscribe because not connected to Solace message router.');
        }
    };

    // Unsubscribes from topic on Solace message router
    subscriber.unsubscribe = function () {
        if (subscriber.session !== null) {
            if (subscriber.subscribed) {
                subscriber.log('Unsubscribing from topic: ' + subscriber.topicName);
                try {
                    subscriber.session.unsubscribe(
                        solace.SolclientFactory.createTopicDestination(subscriber.topicName),
                        true, // generate confirmation when subscription is removed successfully
                        subscriber.topicName, // use topic name as correlation key
                        10000 // 10 seconds timeout for this operation
                    );
                } catch (error) {
                    subscriber.log(error.toString());
                }
            } else {
                subscriber.log('Cannot unsubscribe because not subscribed to the topic "'
                    + subscriber.topicName + '"');
            }
        } else {
            subscriber.log('Cannot unsubscribe because not connected to Solace message router.');
        }
    };

    // Gracefully disconnects from Solace message router
    subscriber.disconnect = function () {
        subscriber.log('Disconnecting from Solace message router...');
        if (subscriber.session !== null) {
            try {
                subscriber.session.disconnect();
            } catch (error) {
                subscriber.log(error.toString());
            }
        } else {
            subscriber.log('Not connected to Solace message router.');
        }
    };

    return subscriber;
};