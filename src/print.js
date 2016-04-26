'use strict';

var _ = require('underscore');

var datum = function(_args)
{
    var args = _.defaults(_args,
                          {numParticipants: 1});
    _.extend(this, args);
};

var data = function()
{
    this.data = [];

    this.concat = function(new_data)
    {
        for (var i = 0; i < new_data.data.length; i++)
            this.data.push(new_data.data[i]);
    }
};

var make_datum = function(args)
{
    return new datum(args);
};

var make_data = function(list)
{
    var dd = new data();
    dd.data = list;
    return dd;
};

var format = function(inputs, kl, sort, nprt, erps)
{
    var list = new data();
    //console.log(inputs, kl, sort, nprt)
    nprt = (nprt == undefined) ? 1 : nprt;
    for (var i = 0; i < inputs.length; i++)
    {
        var temp_input = (typeof inputs[i] == 'string') ? inputs[i] : JSON.stringify(inputs[i]);
        list.data.push(new datum(temp_input, kl[i], nprt, erps[i]));
    }

    if (sort == true)
        list.data.sort(function(x,y){return y.optc - x.optc;});

    return list;
};

var log = function(data)
{
    return data.data;
};

module.exports =
{
    format: format,
    datum: datum,
    data: data,
    make_datum: make_datum,
    make_data: make_data,
    log: log
};
