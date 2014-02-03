"use strict";
//////////////////////////////////////
//tabcomplete.js
//Module for handling tab completions.
logger = logger.module("tabcomplete");

(function(){
    var _commands = require('command').commands;

    var __onTabCompleteJSP = function( __onTC_result, __onTC_sender, __onTC_cmd, __onTC_alias, __onTC_args) {
        var result = __onTC_result;
        var args = __onTC_args;
        var cmdInput = args[0];
        var cmd = _commands[cmdInput];
        if (cmd){
            var opts = cmd.options;
            var len = opts.length;
            if (args.length == 1){
                for (var i = 0;i < len; i++)
                    result.add(opts[i]);
            }else{
                // partial e.g. /jsp chat_color dar
                for (var i = 0;i < len; i++){
                    if (opts[i].indexOf(args[1]) == 0){
                        result.add(opts[i]);
                    }
                }
            }
        }else{
            if (args.length == 0){
                for (var i in _commands)
                    result.add(i);
            }else{
                // partial e.g. /jsp al 
                // should tabcomplete to alias 
                //
                for (var c in _commands){
                    if (c.indexOf(cmdInput) == 0){
                        result.add(c);
                    }
                }
            }
        }
        return result;
    };

    var _isJavaObject = function(o){
        var result = false;
        try {
            o.hasOwnProperty("testForJava");
        }catch (e){
            // java will throw an error when an attempt is made to access the
            // hasOwnProperty method. (it won't exist for Java objects)
            result = true;
        }
        return result;
    };
    var _javaLangObjectMethods = [
        'equals'
        ,'getClass'
        ,'class'
        ,'getClass'
        ,'hashCode'
        ,'notify'
        ,'notifyAll'
        ,'toString'
        ,'wait'
        ,'clone'
        ,'finalize'
    ];
        
    var _getProperties = function(o)
    {
        var result = [];
        if (_isJavaObject(o))
        {
            propertyLoop:
            for (var i in o)
            {
                //
                // don't include standard Object methods
                //
                var isObjectMethod = false;
                for (var j = 0;j < _javaLangObjectMethods.length; j++)
                    if (_javaLangObjectMethods[j] == i)
                        continue propertyLoop;
                var typeofProperty = null;
                try { 
                    typeofProperty = typeof o[i];
                }catch( e ){
                    if (e.message == 'java.lang.IllegalStateException: Entity not leashed'){
                        // wph 20131020 fail silently for Entity leashing in craftbukkit
                    }else{
                        throw e;
                    }
                }
                if (typeofProperty == 'function' )
                    result.push(i+'()');
                else
                    result.push(i);
            }
        }else{
            if (o.constructor == Array)
                return result;
            
            for (var i in o){
                if (i.match(/^[^_]/)){
                    if (typeof o[i] == 'function')
                        result.push(i+'()');
                    else
                        result.push(i);
                }
            }
        }
        return result.sort();
    };

    var onTabCompleteJS = function( __onTC_result, __onTC_sender, __onTC_cmd, __onTC_alias, __onTC_args){
        if (__onTC_cmd.name == 'jsp')
            return tabCompleteJSP( __onTC_result, __onTC_sender, __onTC_cmd, __onTC_alias, __onTC_args );

        var _globalSymbols = _getProperties(global)
        var result = __onTC_result;
        var args = __onTC_args;
        var lastArg = args.length?args[args.length-1]+'':null;
        var propsOfLastArg = [];
        var statement = args.join(' ');
        
        statement = statement.replace(/^\s+/,'').replace(/\s+$/,'');
        
        
        if (statement.length == 0)
            propsOfLastArg = _globalSymbols;
        else{
            var statementSyms = statement.split(/[^\$a-zA-Z0-9_\.]/);
            var lastSymbol = statementSyms[statementSyms.length-1];
            //print('DEBUG: lastSymbol=[' + lastSymbol + ']');
            //
            // try to complete the object ala java IDEs.
            //
            var parts = lastSymbol.split(/\./);
            var name = parts[0];
            var symbol = global[name];
            var lastGoodSymbol = symbol;
            if (typeof symbol != 'undefined')
            {
                for (var i = 1; i < parts.length;i++){
                    name = parts[i];
                    symbol = symbol[name];
                    if (typeof symbol == 'undefined')
                        break;
                    lastGoodSymbol = symbol;
                }
                //print('debug:name['+name+']lastSymbol['+lastSymbol+']symbol['+symbol+']');
                if (typeof symbol == 'undefined'){
                    //
                    // look up partial matches against last good symbol
                    //
                    var objectProps = _getProperties(lastGoodSymbol);
                    if (name == ''){
                        // if the last symbol looks like this.. 
                        // ScriptCraft.
                        //
                        
                        for (var i =0;i < objectProps.length;i++){
                            var candidate = lastSymbol + objectProps[i];
                            var re = new RegExp(lastSymbol + '$','g');
                            propsOfLastArg.push(lastArg.replace(re,candidate));
                        }
                        
                    }else{
                        // it looks like this..
                        // ScriptCraft.co
                        //
                        //print('debug:case Y: ScriptCraft.co');
                        
                        var li = statement.lastIndexOf(name);
                        for (var i = 0; i < objectProps.length;i++){
                            if (objectProps[i].indexOf(name) == 0)
                            {
                                var candidate = lastSymbol.substring(0,lastSymbol.lastIndexOf(name));
                                candidate = candidate + objectProps[i];
                                var re = new RegExp(lastSymbol+ '$','g');
                                //print('DEBUG: re=' + re + ',lastSymbol='+lastSymbol+',lastArg=' + lastArg + ',candidate=' + candidate);
                                propsOfLastArg.push(lastArg.replace(re,candidate));
                            }
                        }
                        
                    }
                }else{
                    //print('debug:case Z:ScriptCraft');
                    var objectProps = _getProperties(symbol);
                    for (var i = 0; i < objectProps.length; i++){
                        var re = new RegExp(lastSymbol+ '$','g');
                        propsOfLastArg.push(lastArg.replace(re,lastSymbol + '.' + objectProps[i]));
                    }
                }
            }else{
                //print('debug:case AB:ScriptCr');
                // loop thru globalSymbols looking for a good match
                for (var i = 0;i < _globalSymbols.length; i++){
                    if (_globalSymbols[i].indexOf(lastSymbol) == 0){
                        var possibleCompletion = _globalSymbols[i];
                        var re = new RegExp(lastSymbol+ '$','g');
                        propsOfLastArg.push(lastArg.replace(re,possibleCompletion));
                    }
                }
                    
            }
        }
        for (var i = 0;i < propsOfLastArg.length; i++)
            result.add(propsOfLastArg[i]);
    }
    //module.exports = onTabCompleteJS;
});

function handleTabComplete(a, b, c, d, e, f){
    logger.log("Tabcomplete called.");
}

exports.handleTabComplete = handleTabComplete;