#!/usr/bin/env node
var fs = require("fs");

function lz4_decompress(data, outdata) {
    var token,
        literalLength,
        matchLength, matchOffset, matchStart, matchEnd,
        offsetIn = 0, 
        offsetOut = 0;
    while (1) {
        var token = data[offsetIn];
        var literalLength = token >> 4;
        var matchLength = token & 0xF;
        offsetIn++;
        if (literalLength) {
            if (literalLength == 0xF) {
                while (data[offsetIn] == 0xFF) {
                    literalLength += 0xFF;
                    offsetIn++;
                }
                literalLength += data[offsetIn];
                offsetIn++;
            }
            data.copy(outdata, offsetOut, offsetIn, offsetIn + literalLength);
            
            offsetIn += literalLength;
            offsetOut += literalLength;
        }

        if (offsetIn < data.length - 2) {
            var matchOffset = data.readUInt16LE(offsetIn);
            offsetIn += 2;

            if (matchLength == 0xF) {
                while (data[offsetIn] == 0xFF) {
                    matchLength += 0xFF;
                    offsetIn++;
                }
                matchLength += data[offsetIn];
                offsetIn++;
            }
            matchLength += 4;
            var matchStart = offsetOut - matchOffset,
                matchEnd = offsetOut - matchOffset + matchLength;
            for (var i=matchStart; i<matchEnd; i++) {
                outdata[offsetOut] = outdata[i];
                offsetOut++;
            }
        } else {
            break;
        }
    }
    return outdata;
}

var infile = "tunneldata_338.dat",
    outfile = "tunneldata_338.decompressed.dat",
    offset = 0;

var data = fs.readFileSync(infile),
    //sizeCompressed = data.readUInt32LE(offset),
    //sizeUncompressed = data.readUInt32LE(offset + 4),
    sizeUncompressed = 1000,
    outdata = new Buffer(Array(sizeUncompressed));

lz4_decompress(data.slice(offset), outdata);

fs.writeFileSync(outfile, outdata);

