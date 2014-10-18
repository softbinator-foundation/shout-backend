var Hapi = require('hapi');
var Joi = require('joi');
var mysql = require('mysql');
var server = new Hapi.Server(process.env.PORT || 3000,{ cors: true });
var randomstring = require("randomstring");
var HashMap = require('hashmap').HashMap;
var Parse = require('parse').Parse;
Parse.initialize("4k2WL9VnC1Jq59Yp07gRZ1oWjUtci6LBMBirRZLP", "RV83s9t5IbjCCYAr63ELN1xAth5PDIqdTgm4jM1w");

var User = Parse.Object.extend("ShoutUser");


var validationCodes = new HashMap();


var mysqlCon = {
    host: '178.63.71.132',
    user: 'rotunnel_sms',
    password: 'BaldedMoveGlumlySome31',
    database: 'rotunnel_sms',
    insecureAuth: true
};
var gammuDB = mysql.createConnection(mysqlCon);


server.route({
    method: 'POST',
    path: '/validate',
    handler: function(request, reply) {
        var randomCode = randomstring.generate(5);
        var query = new Parse.Query(User);
        query.equalTo("phoneNumber", request.payload.phoneNumber);
        query.find({
            success: function(results) {
                if (results.length > 0)
                    randomCode = " Salut, @" + results[0].get('handler') + " . Esti deja inregistrat!";

                validationCodes.set(request.payload.phoneNumber, randomCode);
                var post = {
                    DestinationNumber: request.payload.phoneNumber,
                    TextDecoded: randomCode
                };
                gammuDB.query('INSERT INTO outbox SET ?', post, function(err, result) {
                    if (err)
                        reply(err.toString());
                    if (result)
                        reply('ok');
                });
            },
            error: function(error) {
                alert("Error: " + error.code + " " + error.message);
            }
        });


    },
    config: {
        validate: {
            payload: {
                phoneNumber: Joi.string().required().min(12).max(12)
            }
        }
    }
});

server.route({
    method: 'POST',
    path: '/create',
    handler: function(request, reply) {

        if (validationCodes.get(request.payload.phoneNumber) == request.payload.code) {

            validationCodes.remove(request.payload.phoneNumber);
            var query = new Parse.Query(User);
           
            query.equalTo("handler", request.payload.handler);
           
            query.find({
                success: function(results) {
                   
                    if (results.length > 0)
                        reply('error, already registered!');
                    else {
                   
                        var newUser = new User();
                   
                        newUser.save({
                            phoneNumber: request.payload.phoneNumber,
                            code: request.payload.code,
                            handler: request.payload.handler
                        }, {
                            success: function(gameScore) {
                                var post = {
                                    DestinationNumber: request.payload.phoneNumber,
                                    TextDecoded: " Salut, @" + request.payload.handler + " . Bun venit in Shout!"
                                };
                                gammuDB.query('INSERT INTO outbox SET ?', post, function(err, result) {
                                    if (err)
                                        reply(err.toString());
                                    if (result)
                                        reply('ok');
                                });
                            },
                            error: function(gameScore, error) {
                                reply(error);
                            }
                        });
                    }
                },
                error: function(error) {
                    alert("Error: " + error.code + " " + error.message);
                }
            });
        } else
            reply('invalid confirmation code!');
    },
    config: {
        validate: {
            payload: {
                phoneNumber: Joi.string().required().min(12).max(12),
                code: Joi.string().required().min(5).max(5),
                handler: Joi.string().required().min(4).max(8)

            }
        }
    }
})

server.start(function() {
    console.log('Server running at:', server.info.uri);
});
