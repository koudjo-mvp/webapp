/**
 * Created by P.K.V.M. on 1/28/18.
 */
var mongoose = require('mongoose');
var FacebookStrategy = require('passport-facebook').Strategy;
var TwitterStrategy  = require('passport-twitter').Strategy;

// load up the user model
//var User       = mongoose.model('User');

// load the auth variables
var configAuth = require('./config');
var toolbox = require('./controllers/toolbox');

module.exports = function(passport) {


    /*// used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });*/


    // =========================================================================
    // TWITTER =================================================================
    // =========================================================================
    passport.use(new TwitterStrategy({

            consumerKey     : configAuth.general_parameters.twitter_auth.consumerKey,
            consumerSecret  : configAuth.general_parameters.twitter_auth.consumerSecret,
            callbackURL     : configAuth.general_parameters.twitter_auth.callbackURL,
            passReqToCallback : true
        },
        function(req, token, tokenSecret, profile, done) {

            // make the code asynchronous
            // User.findOne won't fire until we have all our data back from Twitter
            process.nextTick(function() {
                //toolbox.logging('debug',req,'req='+req);
                try{
                    if (!req.cookies.sessionid) {
                        // Not logged-in. Authenticate based on Twitter account.
                        toolbox.logging('debug',req,"user not yet authenticated");
                        done(null, false);
                    } else {
                        // Logged in. Associate Twitter account with user.  Preserve the login
                        // state by supplying the existing user after association.
                        // return done(null, req.user);
                        User.findOne({ 'userid' : req.cookies.username }, function(err, user) {

                            // user already exists and is logged in, we have to link accounts
                            // update the current users facebook credentials
                            user.twitter.id    = profile.id;
                            user.twitter.username  = profile.username;
                            user.twitter.displayName = profile.displayName;
                            try{
                                user.twitter.photos = profile.photos[0].value;
                            } catch(err){
                                user.twitter.photos = "";
                            }
                            user.set('twitter_access', {'owner':req.cookies.userid,'access':'pu'});
                            user.twitter_token    = token;
                            user.set('twitter_token_access', {'owner':req.cookies.userid,'access':'pr'});
                            user.twitter_tokensecret  = tokenSecret;
                            user.set('twitter_tokensecret_access', {'owner':req.cookies.userid,'access':'pr'});
                            // save the user
                            user.save(function(err) {
                                if (err)
                                    return done(err);
                                return done(null,profile);
                            });
                        });
                    }
                } catch(err){
                    return done(err);
                }
            });

        }));

    passport.use(new FacebookStrategy({

            clientID        : configAuth.general_parameters.facebook_auth.clientID,
            clientSecret    : configAuth.general_parameters.facebook_auth.clientSecret,
            callbackURL     : configAuth.general_parameters.facebook_auth.callbackURL,
            profileFields: ['id', 'name', 'photos', 'email'],
            passReqToCallback : true

        },
        function(req, token, tokenSecret, profile, done) {

            // make the code asynchronous
            // User.findOne won't fire until we have all our data back from Facebook
            process.nextTick(function() {
                //toolbox.logging('debug',req,'req='+req);
                try{
                    if (!req.cookies.sessionid) {
                        // Not logged-in. Authenticate based on Facebook account.
                        toolbox.logging('debug',req,"user not yet authenticated");
                        done(null, false);
                    } else {
                        // Logged in. Associate Facebook account with user.  Preserve the login
                        // state by supplying the existing user after association.
                        // return done(null, req.user);
                        User.findOne({ 'userid' : req.cookies.username }, function(err, user) {

                            // user already exists and is logged in, we have to link accounts
                            // update the current users facebook credentials
                            //toolbox.logging('debug',req,"profile: "+JSON.stringify(profile));
                            //profile: {"id":"103881553764917","name":{"familyName":"Che","givenName":"Yawa"},"emails":[{"value":"pr@webapp.com"}],
                            //"photos":[{"value":"https://scontent.xx.fbcdn.net/v/t1.0-1/c15.0.50.50/p50x50/10354686_10150004552801856_220367501106153455_n.jpg?oh=baf3745408876788393e9ca2b7e1dc94&oe=5AEBF02F"}],
                            // "profile":"facebook","_raw":"{\"id\":\"103881553764917\",\"first_name\":\"Yawa\",\"last_name\":\"Che\",
                            // \"picture\":{\"data\":{\"height\":50,\"is_silhouette\":true,\"url\":\"https:\\/\\/scontent.xx.fbcdn.net\\/v\\/t1.0-1\\/c15.0.50.50\\/p50x50\\/10354686_10150004552801856_220367501106153455_n.jpg?oh=baf3745408876788393e9ca2b7e1dc94&oe=5AEBF02F\",\"width\":50}},\"email\":\"pr\\u0040webapp.com\"}","_json":{"id":"103881553764917","first_name":"Yawa","last_name":"Che","picture":{"data":{"height":50,"is_silhouette":true,"url":"https://scontent.xx.fbcdn.net/v/t1.0-1/c15.0.50.50/p50x50/10354686_10150004552801856_220367501106153455_n.jpg?oh=baf3745408876788393e9ca2b7e1dc94&oe=5AEBF02F","width":50}},
                            // "email":"pr@webapp.com"}}

                            user.facebook.id    = profile.id; // set the users facebook id
                            user.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName; // look at the passport user profile to see how names are returned
                            try{
                                user.facebook.email = profile.emails[0].value;
                            } catch(err){
                                user.facebook.email = "";
                            }
                            try{
                                user.facebook.photos  = profile.photos[0].value;
                            } catch(err){
                                user.facebook.photos  = "";
                            }
                            user.set('facebook_access', {'owner':req.cookies.userid,'access':'pu'});
                            user.facebook_token    = token;
                            user.set('facebook_token_access', {'owner':req.cookies.userid,'access':'pr'});
                            user.facebook_tokensecret  = tokenSecret;
                            user.set('facebook_tokensecret_access', {'owner':req.cookies.userid,'access':'pr'});
                            // save the user
                            user.save(function(err) {
                                if (err)
                                    return done(err);
                                return done(null,profile);
                            });
                        });
                    }
                } catch(err){
                    return done(err);
                }
            });

        }));
};