/*
 * Copyright (C) 2016 Bilibili. All Rights Reserved.
 *
 * This file is derived from dailymotion's hls.js library (hls.js/src/remux/mp4-generator.js)
 * @author zheng qian <xqq@xqq.im>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

//  MP4 boxes generator for ISO BMFF (ISO Base Media File Format, defined in ISO/IEC 14496-12)
class MP41 {

    static init() {
        MP41.types = {
            avc1: [], avcC: [], btrt: [], dinf: [],
            dref: [], esds: [], ftyp: [], hdlr: [],
            mdat: [], mdhd: [], mdia: [], mfhd: [],
            minf: [], moof: [], moov: [], mp4a: [],
            mvex: [], mvhd: [], sdtp: [], stbl: [],
            stco: [], stsc: [], stsd: [], stsz: [],
            stts: [], tfdt: [], tfhd: [], traf: [],
            trak: [], trun: [], trex: [], tkhd: [],
            vmhd: [], smhd: [], '.mp3': [], free: [],
            edts: [], elst: [], stss: []
        };

        for (let name in MP41.types) {
            if (MP41.types.hasOwnProperty(name)) {
                MP41.types[name] = [
                    name.charCodeAt(0),
                    name.charCodeAt(1),
                    name.charCodeAt(2),
                    name.charCodeAt(3)
                ];
            }
        }

        let constants = MP41.constants = {};


        constants.FTYP = new Uint8Array([
            0x69, 0x73, 0x6F, 0x6D,  // major_brand: isom
            0x0,  0x0,  0x02,  0x0,   // minor_version: 0x20
            0x69, 0x73, 0x6F, 0x6D,  // isom
            0x69, 0x73, 0x6F, 0x32,  // iso
            0x61, 0x76, 0x63, 0x31,   // avc1
            0x6D, 0x70, 0x34, 0x31,   // mp41
            0x00, 0x00, 0x00, 0x00
        ]);

        constants.STSD_PREFIX = new Uint8Array([
            0x00, 0x00, 0x00, 0x00,  // version(0) + flags
            0x00, 0x00, 0x00, 0x01   // entry_count
        ]);

        constants.STTS = new Uint8Array([
            0x00, 0x00, 0x00, 0x00,  // version(0) + flags
            0x00, 0x00, 0x00, 0x00   // entry_count
        ]);

        constants.STSC = constants.STCO = constants.STTS;

        constants.STSZ = new Uint8Array([
            0x00, 0x00, 0x00, 0x00,  // version(0) + flags
            0x00, 0x00, 0x00, 0x00,  // sample_size
            0x00, 0x00, 0x00, 0x00   // sample_count
        ]);

        constants.HDLR_VIDEO = new Uint8Array([
            0x00, 0x00, 0x00, 0x00,  // version(0) + flags
            0x00, 0x00, 0x00, 0x00,  // pre_defined
            0x76, 0x69, 0x64, 0x65,  // handler_type: 'vide'
            0x00, 0x00, 0x00, 0x00,  // reserved: 3 * 4 bytes
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x56, 0x69, 0x64, 0x65,
            0x6F, 0x48, 0x61, 0x6E,
            0x64, 0x6C, 0x65, 0x72, 0x00  // name: VideoHandler
        ]);

        constants.HDLR_AUDIO = new Uint8Array([
            0x00, 0x00, 0x00, 0x00,  // version(0) + flags
            0x00, 0x00, 0x00, 0x00,  // pre_defined
            0x73, 0x6F, 0x75, 0x6E,  // handler_type: 'soun'
            0x00, 0x00, 0x00, 0x00,  // reserved: 3 * 4 bytes
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x53, 0x6F, 0x75, 0x6E,
            0x64, 0x48, 0x61, 0x6E,
            0x64, 0x6C, 0x65, 0x72, 0x00  // name: SoundHandler
        ]);

        constants.DREF = new Uint8Array([
            0x00, 0x00, 0x00, 0x00,  // version(0) + flags
            0x00, 0x00, 0x00, 0x01,  // entry_count
            0x00, 0x00, 0x00, 0x0C,  // entry_size
            0x75, 0x72, 0x6C, 0x20,  // type 'url '
            0x00, 0x00, 0x00, 0x01   // version(0) + flags
        ]);

        // Sound media header
        constants.SMHD = new Uint8Array([
            0x00, 0x00, 0x00, 0x00,  // version(0) + flags
            0x00, 0x00, 0x00, 0x00   // balance(2) + reserved(2)
        ]);

        // video media header
        constants.VMHD = new Uint8Array([
            0x00, 0x00, 0x00, 0x01,  // version(0) + flags
            0x00, 0x00,              // graphicsmode: 2 bytes
            0x00, 0x00, 0x00, 0x00,  // opcolor: 3 * 2 bytes
            0x00, 0x00
        ]);
    }

    // Generate a box
    static box(type) {
        let size = 8;
        let result = null;
        let datas = Array.prototype.slice.call(arguments, 1);
        let arrayCount = datas.length;

        for (let i = 0; i < arrayCount; i++) {
            size += datas[i].byteLength;
        }
        result = new Uint8Array(size);
        result[0] = (size >>> 24) & 0xFF;  // size
        result[1] = (size >>> 16) & 0xFF;
        result[2] = (size >>>  8) & 0xFF;
        result[3] = (size) & 0xFF;

        result.set(type, 4);  // type

        let offset = 8;
        for (let i = 0; i < arrayCount; i++) {  // data body
            result.set(datas[i], offset);
            offset += datas[i].byteLength;
        }

        return result;
    }

    // emit ftyp & moov
    static generateInitSegment(meta, trakList, mdatBytes) {

        let ftyp = MP41.box(MP41.types.ftyp, MP41.constants.FTYP);
        let free = MP41.box(MP41.types.free);
        // allocate mdatbox
        let offset = 8;
        let mdatbox = new Uint8Array();
        if (mdatBytes  + offset >= Math.pow(2, 32) - 1) {  //large size
            offset = 16;
            mdatbox = new Uint8Array(mdatBytes + offset);
            mdatbox.set(new Uint8Array([0x00, 0x00, 0x00, 0x01]), 0);
            mdatbox.set(MP41.types.mdat, 4);
            mdatbox.set(new Uint8Array([
                (mdatBytes + 8 >>> 56) & 0xFF,
                (mdatBytes + 8 >>> 48) & 0xFF,
                (mdatBytes + 8 >>> 40) & 0xFF,
                (mdatBytes + 8 >>> 32) & 0xFF,
                (mdatBytes + 8 >>> 24) & 0xFF,
                (mdatBytes + 8 >>> 16) & 0xFF,
                (mdatBytes + 8 >>>  8) & 0xFF,
                (mdatBytes + 8) & 0xFF
            ]), 8);
        } else {
            mdatbox = new Uint8Array(mdatBytes + offset);
            mdatbox[0] = (mdatBytes + 8 >>> 24) & 0xFF;
            mdatbox[1] = (mdatBytes + 8 >>> 16) & 0xFF;
            mdatbox[2] = (mdatBytes + 8 >>>  8) & 0xFF;
            mdatbox[3] = (mdatBytes + 8) & 0xFF;
            mdatbox.set(MP41.types.mdat, 4);
        }

        // Write samples into mdatbox
        for (let i = 0; i < trakList.length; i++) {
            let trak = trakList[i];
            trak.duration = trak.refSampleDuration * trak.sequenceNumber;
            for (let j = 0; j < trak.sequenceNumber; j++) {
                let sample = trak.samples[j];
                sample.chunkOffset = ftyp.byteLength + free.byteLength + offset;
                let units = [], unitLen = sample.units.length;
                for (let n = 0; n < unitLen; n ++) {
                    units[n] = Object.assign({}, sample.units[n]);
                }
                while (units.length) {
                    let unit = units.shift();
                    let data = unit.data;
                    mdatbox.set(data, offset);
                    offset += data.byteLength;
                }
            }
        }
        let moov = MP41.moov(meta, trakList);
        let result = new Uint8Array(ftyp.byteLength + moov.byteLength + mdatbox.byteLength + free.byteLength);
        result.set(ftyp, 0);
        result.set(free, ftyp.byteLength);
        result.set(mdatbox, ftyp.byteLength + free.byteLength);
        result.set(moov, ftyp.byteLength + mdatbox.byteLength + free.byteLength);
        return result;
    }

    // Movie metadata box
    static moov(meta, trakList) {
        let timescale = meta.timescale;
        let duration = meta.duration;
        let trakLen = trakList.length;
        let mvhd = MP41.mvhd(timescale, duration, trakList[trakLen -1].id + 1);
        let trakArrayBuffer = new Uint8Array();
        for (let i = 0; i < trakLen; i++) {
            let trak = MP41.trak(trakList[i]);
            let arrayBuffer = new Uint8Array(trak.byteLength + trakArrayBuffer.byteLength);
            arrayBuffer.set(trakArrayBuffer, 0);
            arrayBuffer.set(trak, trakArrayBuffer.byteLength);
            trakArrayBuffer = new Uint8Array(arrayBuffer.byteLength);
            trakArrayBuffer.set(arrayBuffer, 0);
        }
        return MP41.box(MP41.types.moov, mvhd, trakArrayBuffer);

    }

    // Movie header box
    static mvhd(timescale, duration, trackId) {
        return MP41.box(MP41.types.mvhd, new Uint8Array([
            0x00, 0x00, 0x00, 0x00,  // version(0) + flags
            0xCE, 0xBA, 0xFD, 0xA8,  // creation_time
            0xCE, 0xBA, 0xFD, 0xA8,  // modification_time
            (timescale >>> 24) & 0xFF,  // timescale: 4 bytes
            (timescale >>> 16) & 0xFF,
            (timescale >>>  8) & 0xFF,
            (timescale) & 0xFF,
            (duration >>> 24) & 0xFF,   // duration: 4 bytes
            (duration >>> 16) & 0xFF,
            (duration >>>  8) & 0xFF,
            (duration) & 0xFF,
            0x00, 0x01, 0x00, 0x00,  // Preferred rate: 1.0
            0x01, 0x00, 0x00, 0x00,  // PreferredVolume(1.0, 2bytes) + reserved(2bytes)
            0x00, 0x00, 0x00, 0x00,  // reserved: 4 + 4 bytes
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x01, 0x00, 0x00,  // ----begin composition matrix----
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x01, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x40, 0x00, 0x00, 0x00,  // ----end composition matrix----
            0x00, 0x00, 0x00, 0x00,  // ----begin pre_defined 6 * 4 bytes----
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,  // ----end pre_defined 6 * 4 bytes----
            (trackId >>> 24) & 0xFF,   // next_track_ID: 4 bytes  3
            (trackId >>> 16) & 0xFF,
            (trackId >>>  8) & 0xFF,
            (trackId) & 0xFF
        ]));
    }

    // Track box
    static trak(trak) {
        return MP41.box(MP41.types.trak, MP41.tkhd(trak), /* MP41.edts(trak),*/ MP41.mdia(trak));
    }

    // Track header box
    static tkhd(trak) {
        let trackId = trak.id, duration = trak.duration;
        let width = trak.presentWidth, height = trak.presentHeight;
        if (trak.type === 'video') {
            return MP41.box(MP41.types.tkhd, new Uint8Array([
                0x00, 0x00, 0x00, 0x0F,  // version(0) + flags
                0xCE, 0xBA, 0xFD, 0xA8,  // creation_time
                0xCE, 0xBA, 0xFD, 0xA8,  // modification_time
                (trackId >>> 24) & 0xFF,  // track_ID: 4 bytes
                (trackId >>> 16) & 0xFF,
                (trackId >>>  8) & 0xFF,
                (trackId) & 0xFF,
                0x00, 0x00, 0x00, 0x00,  // reserved: 4 bytes
                (duration >>> 24) & 0xFF, // duration: 4 bytes
                (duration >>> 16) & 0xFF,
                (duration >>>  8) & 0xFF,
                (duration) & 0xFF,
                0x00, 0x00, 0x00, 0x00,  // reserved: 2 * 4 bytes
                0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00,  // layer(2bytes) + alternate_group(2bytes)
                0x00, 0x00, 0x00, 0x00,  // volume(2bytes) + reserved(2bytes)
                0x00, 0x01, 0x00, 0x00,  // ----begin composition matrix----
                0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00,
                0x00, 0x01, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00,
                0x40, 0x00, 0x00, 0x00,  // ----end composition matrix----
                (width >>> 8) & 0xFF,    // width and height
                (width) & 0xFF,
                0x00, 0x00,
                (height >>> 8) & 0xFF,
                (height) & 0xFF,
                0x00, 0x00
            ]));
        } else if (trak.type === 'audio') {
            return MP41.box(MP41.types.tkhd, new Uint8Array([
                0x00, 0x00, 0x00, 0x0F,  // version(0) + flags
                0xCE, 0xBA, 0xFD, 0xA8,  // creation_time
                0xCE, 0xBA, 0xFD, 0xA8,  // modification_time
                (trackId >>> 24) & 0xFF,  // track_ID: 4 bytes
                (trackId >>> 16) & 0xFF,
                (trackId >>>  8) & 0xFF,
                (trackId) & 0xFF,
                0x00, 0x00, 0x00, 0x00,  // reserved: 4 bytes
                (duration >>> 24) & 0xFF, // duration: 4 bytes
                (duration >>> 16) & 0xFF,
                (duration >>>  8) & 0xFF,
                (duration) & 0xFF,
                0x00, 0x00, 0x00, 0x00,  // reserved: 2 * 4 bytes
                0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00,  // layer(2bytes) + alternate_group(2bytes)
                0x00, 0x00, 0x00, 0x00,  // volume(2bytes) + reserved(2bytes)
                0x00, 0x01, 0x00, 0x00,  // ----begin composition matrix----
                0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00,
                0x00, 0x01, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00,
                0x40, 0x00, 0x00, 0x00,  // ----end composition matrix----
                0x00, 0x00, 0x00, 0x00,   // audio （8 bytes 0）
                0x00, 0x00, 0x00, 0x00
            ]));
        }

    }

    static edts(meta) {
        return MP41.box(MP41.types.edts, MP41.elst(meta));
    }
    static elst(meta) {
        let duration = meta.duration;
        let sampleDuration = meta.refSampleDuration;
        return MP41.box(MP41.types.elst, new Uint8Array([
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x02,
            (sampleDuration >>> 24) & 0xFF,   // SampleDuration: 4 bytes
            (sampleDuration >>> 16) & 0xFF,
            (sampleDuration >>>  8) & 0xFF,
            (sampleDuration) & 0xFF,
            0xFF, 0xFF, 0xFF, 0xFF,
            0x00, 0x01, 0x00, 0x00,
            (duration >>> 24) & 0xFF,   // duration: 4 bytes
            (duration >>> 16) & 0xFF,
            (duration >>>  8) & 0xFF,
            (duration) & 0xFF,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x01, 0x00, 0x00
        ]));
    }
    // Media Box
    static mdia(trak) {
        return MP41.box(MP41.types.mdia, MP41.mdhd(trak), MP41.hdlr(trak), MP41.minf(trak));
    }

    // Media header box
    static mdhd(trak) {
        let timescale = trak.timescale / trak.refSampleDuration;
        let duration = trak.sequenceNumber;
        return MP41.box(MP41.types.mdhd, new Uint8Array([
            0x00, 0x00, 0x00, 0x00,  // version(0) + flags
            0xCE, 0xBA, 0xFD, 0xA8,  // creation_time
            0xCE, 0xBA, 0xFD, 0xA8,  // modification_time
            (timescale >>> 24) & 0xFF,  // timescale: 4 bytes
            (timescale >>> 16) & 0xFF,
            (timescale >>>  8) & 0xFF,
            (timescale) & 0xFF,
            (duration >>> 24) & 0xFF,   // duration: 4 bytes
            (duration >>> 16) & 0xFF,
            (duration >>>  8) & 0xFF,
            (duration) & 0xFF,
            0x55, 0xC4,             // language: und (undetermined)
            0x00, 0x00              // pre_defined = 0
        ]));
    }

    // Media handler reference box
    static hdlr(meta) {
        let data = null;
        if (meta.type === 'audio') {
            data = MP41.constants.HDLR_AUDIO;
        } else {
            data = MP41.constants.HDLR_VIDEO;
        }
        return MP41.box(MP41.types.hdlr, data);
    }

    // Media infomation box
    static minf(trak) {
        let xmhd = null;
        if (trak.type === 'audio') {
            xmhd = MP41.box(MP41.types.smhd, MP41.constants.SMHD);
        } else {
            xmhd = MP41.box(MP41.types.vmhd, MP41.constants.VMHD);
        }
        return MP41.box(MP41.types.minf, xmhd, MP41.dinf(), MP41.stbl(trak));
    }

    // Data infomation box
    static dinf() {
        return MP41.box(MP41.types.dinf,
            MP41.box(MP41.types.dref, MP41.constants.DREF)
        );
    }

    // Sample table box
    static stbl(trak) {
        let sampleList = trak.samples;
        let sampleToChunk = [
            {
                No: 1,
                num: 0,
                sampleDelte: 1,
                chunkNo: 1,
                duration: sampleList[0].duration
            }
        ];
        let durationList = [sampleList[0].duration];
        let len = sampleList.length;
        for (let i = 0; i < len; i++) {
            for (let j = 0; j < sampleToChunk.length; j++) {
                if (sampleList[i].duration === sampleToChunk[j].duration) {
                    sampleToChunk[j].num ++;
                } else {
                    if (durationList.indexOf(sampleList[i].duration) < 0) {
                        durationList.push(sampleList[i].duration);
                        sampleToChunk.push({
                            No: 2,
                            num: 0,
                            sampleDelte: 1,
                            chunkNo: i + 1,
                            duration: sampleList[i].duration
                        });
                    }
                }
            }

        }

        return MP41.box(MP41.types.stbl,  // type: stbl
            MP41.stsd(trak, sampleList),  // Sample Description Table
            MP41.stts(sampleToChunk), // Time-To-Sample
            MP41.stss(sampleList),
            MP41.stsc(sampleToChunk), //Sample-To-Chunk
            MP41.stsz(sampleList), // Sample size
            MP41.stco(sampleToChunk, sampleList)// Chunk offset
        ); 

    }

    static stts(sampleToChunk) {
        let sampleToChunkLen = sampleToChunk.length;
        let stts = new Uint8Array([
            0x00, 0x00, 0x00, 0x00,  // version(0) + flags
            (sampleToChunkLen >>> 24) & 0xFF,   // entry_count: 4 bytes
            (sampleToChunkLen  >>> 16) & 0xFF,
            (sampleToChunkLen  >>>  8) & 0xFF,
            (sampleToChunkLen) & 0xFF
        ]);
        let offset = stts.byteLength, sttsInfo = new Uint8Array(offset + sampleToChunkLen * 8);

        sttsInfo.set(stts, 0);
        for (let index = 0; index < sampleToChunkLen; index ++) {
            sttsInfo.set(new Uint8Array([
                (sampleToChunk[index].num >>> 24) & 0xFF,   // samplesPerChunk: 4 bytes
                (sampleToChunk[index].num  >>> 16) & 0xFF,
                (sampleToChunk[index].num  >>>  8) & 0xFF,
                (sampleToChunk[index].num) & 0xFF,
                (sampleToChunk[index].sampleDelte >>> 24) & 0xFF,   // samplesDescription index: 4 bytes
                (sampleToChunk[index].sampleDelte  >>> 16) & 0xFF,
                (sampleToChunk[index].sampleDelte  >>>  8) & 0xFF,
                (sampleToChunk[index].sampleDelte) & 0xFF
            ]), offset);
            offset += 8;
        }

        return MP41.box(MP41.types.stts, sttsInfo);
    }
    static stss(mdatDataList) {
        let keyFrameMap = [], len = mdatDataList.length;
        for (let i = 0; i < len; i++) {
            if (mdatDataList[i].isKeyframe === true) {
                keyFrameMap.push(i + 1);
            }
        }
        let  keyFrameLen = keyFrameMap.length;
        let stss = new Uint8Array([
            0x00, 0x00, 0x00, 0x00,  // version(0) + flags
            (keyFrameLen >>> 24) & 0xFF,   // entry_count: 4 bytes
            (keyFrameLen  >>> 16) & 0xFF,
            (keyFrameLen  >>>  8) & 0xFF,
            (keyFrameLen) & 0xFF
        ]);
        let offset = stss.byteLength, stssInfo = new Uint8Array(offset + keyFrameLen * 4);

        stssInfo.set(stss, 0);
        for (let index = 0; index < keyFrameLen; index ++) {
            stssInfo.set(new Uint8Array([
                (keyFrameMap[index] >>> 24) & 0xFF,   // entry_count: 4 bytes
                (keyFrameMap[index]  >>> 16) & 0xFF,
                (keyFrameMap[index]  >>>  8) & 0xFF,
                (keyFrameMap[index]) & 0xFF
            ]), offset);
            offset += 4;
        }

        return MP41.box(MP41.types.stss, stssInfo);
    }
    static stsc(sampleToChunk) {
        let sampleToChunkLen = sampleToChunk.length;
        let stsc = new Uint8Array([
            0x00, 0x00, 0x00, 0x00,  // version(0) + flags
            (sampleToChunkLen >>> 24) & 0xFF,   // entry_count: 4 bytes
            (sampleToChunkLen  >>> 16) & 0xFF,
            (sampleToChunkLen  >>>  8) & 0xFF,
            (sampleToChunkLen) & 0xFF
        ]);
        let offset = stsc.byteLength, stscInfo = new Uint8Array(offset + sampleToChunkLen * 12);

        stscInfo.set(stsc, 0);
        for (let index = 0; index < sampleToChunkLen; index ++) {
            let firstChunk = sampleToChunk[index].chunkNo, samplesPerChunk = sampleToChunk[index].num, sampleDelte = sampleToChunk[index].sampleDelte;
            stscInfo.set(new Uint8Array([
                (firstChunk >>> 24) & 0xFF,   // firstChunk: 4 bytes
                (firstChunk  >>> 16) & 0xFF,
                (firstChunk  >>>  8) & 0xFF,
                (firstChunk) & 0xFF,
                (samplesPerChunk >>> 24) & 0xFF,   // samplesPerChunk: 4 bytes
                (samplesPerChunk  >>> 16) & 0xFF,
                (samplesPerChunk  >>>  8) & 0xFF,
                (samplesPerChunk) & 0xFF,
                (sampleDelte >>> 24) & 0xFF,   // samplesDescription index: 4 bytes
                (sampleDelte  >>> 16) & 0xFF,
                (sampleDelte  >>>  8) & 0xFF,
                (sampleDelte) & 0xFF
            ]), offset);
            offset += 12;
        }

        return MP41.box(MP41.types.stsc, stscInfo);
    }
    static stsz(mdatDataList) {
        let len = mdatDataList.length;
        let stsz = new Uint8Array([
            0x00, 0x00, 0x00, 0x00,  // version(0) + flags
            0x00, 0x00, 0x00, 0x00,  // sample size    当所有sample的size都一样时，该值为sample的size ，否则为0
            (len >>> 24) & 0xFF,   // sample count: 4 bytes
            (len  >>> 16) & 0xFF,
            (len  >>>  8) & 0xFF,
            (len) & 0xFF
        ]);
        let offset = stsz.byteLength, stszInfo = new Uint8Array(offset + len * 4);

        stszInfo.set(stsz, 0);
        for (let i = 0; i < len; i++) {
            let units = mdatDataList[i].units;
            while (units.length) {
                let unit = units.shift();
                let data = unit.data;
                let dataLen = data.byteLength;
                stszInfo.set(new Uint8Array([
                    (dataLen >>> 24) & 0xFF,   //per  sample size: 4 bytes
                    (dataLen  >>> 16) & 0xFF,
                    (dataLen  >>>  8) & 0xFF,
                    (dataLen) & 0xFF
                ]), offset);
                offset += 4;
            }
        }

        return MP41.box(MP41.types.stsz, stszInfo);

    }
    static stco(sampleToChunk, mdatDataList) {
        let offset = mdatDataList[0].chunkOffset;

        return MP41.box(MP41.types.stco, new Uint8Array([
            0x00, 0x00, 0x00, 0x00, // version(0) + flags
            0x00, 0x00, 0x00, 0x01, // entry_count: 4 bytes //默认只有视频时，只有一段chunk
            (offset >>> 24) & 0xFF,   // samplesPerChunk: 4 bytes
            (offset  >>> 16) & 0xFF,
            (offset  >>>  8) & 0xFF,
            (offset) & 0xFF
        ]));
    }


    // Sample description box
    static stsd(meta) {
        if (meta.type === 'audio') {
            if (meta.codec === 'mp3') {
                return MP41.box(MP41.types.stsd, MP41.constants.STSD_PREFIX, MP41.mp3(meta));
            }
            // else: aac -> mp4a
            return MP41.box(MP41.types.stsd, MP41.constants.STSD_PREFIX, MP41.mp4a(meta));
        } else {
            return MP41.box(MP41.types.stsd, MP41.constants.STSD_PREFIX, MP41.avc1(meta));
        }
    }

    static mp3(meta) {
        let channelCount = meta.channelCount;
        let sampleRate = meta.audioSampleRate;

        let data = new Uint8Array([
            0x00, 0x00, 0x00, 0x00,  // reserved(4)
            0x00, 0x00, 0x00, 0x01,  // reserved(2) + data_reference_index(2)
            0x00, 0x00, 0x00, 0x00,  // reserved: 2 * 4 bytes
            0x00, 0x00, 0x00, 0x00,
            0x00, channelCount,      // channelCount(2)
            0x00, 0x10,              // sampleSize(2)
            0x00, 0x00, 0x00, 0x00,  // reserved(4)
            (sampleRate >>> 8) & 0xFF,  // Audio sample rate
            (sampleRate) & 0xFF,
            0x00, 0x00
        ]);

        return MP41.box(MP41.types['.mp3'], data);
    }

    static mp4a(meta) {
        let channelCount = meta.channelCount;
        let sampleRate = meta.audioSampleRate;

        let data = new Uint8Array([
            0x00, 0x00, 0x00, 0x00,  // reserved(4)
            0x00, 0x00, 0x00, 0x01,  // reserved(2) + data_reference_index(2)
            0x00, 0x00, 0x00, 0x00,  // reserved: 2 * 4 bytes
            0x00, 0x00, 0x00, 0x00,
            0x00, channelCount,      // channelCount(2)
            0x00, 0x10,              // sampleSize(2)
            0x00, 0x00, 0x00, 0x00,  // reserved(4)
            (sampleRate >>> 8) & 0xFF,  // Audio sample rate
            (sampleRate) & 0xFF,
            0x00, 0x00
        ]);

        return MP41.box(MP41.types.mp4a, data, MP41.esds(meta));
    }

    static esds(meta) {
        let config = meta.config || [];
        let configSize = config.length;
        let data = new Uint8Array([
            0x00, 0x00, 0x00, 0x00,  // version 0 + flags

            0x03,                    // descriptor_type
            0x17 + configSize,       // length3
            0x00, 0x01,              // es_id
            0x00,                    // stream_priority

            0x04,                    // descriptor_type
            0x0F + configSize,       // length
            0x40,                    // codec: mpeg4_audio
            0x15,                    // stream_type: Audio
            0x00, 0x00, 0x00,        // buffer_size
            0x00, 0x00, 0x00, 0x00,  // maxBitrate
            0x00, 0x00, 0x00, 0x00,  // avgBitrate

            0x05                     // descriptor_type
        ].concat([
            configSize
        ]).concat(
            config
        ).concat([
            0x06, 0x01, 0x02         // GASpecificConfig
        ]));
        return MP41.box(MP41.types.esds, data);
    }

    static avc1(meta) {
        let avcc = meta.avcc;
        let width = meta.codecWidth, height = meta.codecHeight;

        let data = new Uint8Array([
            0x00, 0x00, 0x00, 0x00,  // reserved(4)
            0x00, 0x00, 0x00, 0x01,  // reserved(2) + data_reference_index(2)
            0x00, 0x00, 0x00, 0x00,  // pre_defined(2) + reserved(2)
            0x00, 0x00, 0x00, 0x00,  // pre_defined: 3 * 4 bytes
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            (width >>> 8) & 0xFF,    // width: 2 bytes
            (width) & 0xFF,
            (height >>> 8) & 0xFF,   // height: 2 bytes
            (height) & 0xFF,
            0x00, 0x48, 0x00, 0x00,  // horizresolution: 4 bytes
            0x00, 0x48, 0x00, 0x00,  // vertresolution: 4 bytes
            0x00, 0x00, 0x00, 0x00,  // reserved: 4 bytes
            0x00, 0x01,              // frame_count
            0x0A,                    // strlen  10bytes
            0x78, 0x71, 0x71, 0x2F,  // compressorname: 32 bytes   xqq/flv.js
            0x66, 0x6C, 0x76, 0x2E,
            0x6A, 0x73, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00,
            0x00, 0x18,              // depth
            0xFF, 0xFF               // pre_defined = -1
        ]);
        return MP41.box(MP41.types.avc1, data, MP41.box(MP41.types.avcC, avcc));
    }

    // Movie Extends box
    static mvex(meta) {
        return MP41.box(MP41.types.mvex, MP41.trex(meta));
    }

    // Track Extends box
    static trex(meta) {
        let trackId = meta.id;
        let data = new Uint8Array([
            0x00, 0x00, 0x00, 0x00,  // version(0) + flags
            (trackId >>> 24) & 0xFF, // track_ID
            (trackId >>> 16) & 0xFF,
            (trackId >>>  8) & 0xFF,
            (trackId) & 0xFF,
            0x00, 0x00, 0x00, 0x01,  // default_sample_description_index
            0x00, 0x00, 0x00, 0x00,  // default_sample_duration
            0x00, 0x00, 0x00, 0x00,  // default_sample_size
            0x00, 0x01, 0x00, 0x01   // default_sample_flags
        ]);
        return MP41.box(MP41.types.trex, data);
    }

    // Movie fragment box
    static moof(track, baseMediaDecodeTime) {
        return MP41.box(MP41.types.moof, MP41.mfhd(track.sequenceNumber), MP41.traf(track, baseMediaDecodeTime));
    }

    static mfhd(sequenceNumber) {
        let data = new Uint8Array([
            0x00, 0x00, 0x00, 0x00,
            (sequenceNumber >>> 24) & 0xFF,  // sequence_number: int32
            (sequenceNumber >>> 16) & 0xFF,
            (sequenceNumber >>>  8) & 0xFF,
            (sequenceNumber) & 0xFF
        ]);
        return MP41.box(MP41.types.mfhd, data);
    }

    // Track fragment box
    static traf(track, baseMediaDecodeTime) {
        let trackId = track.id;

        // Track fragment header box
        let tfhd = MP41.box(MP41.types.tfhd, new Uint8Array([
            0x00, 0x00, 0x00, 0x00,  // version(0) & flags
            (trackId >>> 24) & 0xFF, // track_ID
            (trackId >>> 16) & 0xFF,
            (trackId >>>  8) & 0xFF,
            (trackId) & 0xFF
        ]));
        // Track Fragment Decode Time
        let tfdt = MP41.box(MP41.types.tfdt, new Uint8Array([
            0x00, 0x00, 0x00, 0x00,  // version(0) & flags
            (baseMediaDecodeTime >>> 24) & 0xFF,  // baseMediaDecodeTime: int32
            (baseMediaDecodeTime >>> 16) & 0xFF,
            (baseMediaDecodeTime >>>  8) & 0xFF,
            (baseMediaDecodeTime) & 0xFF
        ]));
        let sdtp = MP41.sdtp(track);
        let trun = MP41.trun(track, sdtp.byteLength + 16 + 16 + 8 + 16 + 8 + 8);

        return MP41.box(MP41.types.traf, tfhd, tfdt, trun, sdtp);
    }

    // Sample Dependency Type box
    static sdtp(track) {
        let samples = track.samples || [];
        let sampleCount = samples.length;
        let data = new Uint8Array(4 + sampleCount);
        // 0~4 bytes: version(0) & flags
        for (let i = 0; i < sampleCount; i++) {
            let flags = samples[i].flags;
            data[i + 4] = (flags.isLeading << 6)    // is_leading: 2 (bit)
                        | (flags.dependsOn << 4)    // sample_depends_on
                        | (flags.isDependedOn << 2) // sample_is_depended_on
                        | (flags.hasRedundancy);    // sample_has_redundancy
        }
        return MP41.box(MP41.types.sdtp, data);
    }

    // Track fragment run box
    static trun(track, offset) {
        let samples = track.samples || [];
        let sampleCount = samples.length;
        let dataSize = 12 + 16 * sampleCount;
        let data = new Uint8Array(dataSize);
        offset += 8 + dataSize;

        data.set([
            0x00, 0x00, 0x0F, 0x01,      // version(0) & flags
            (sampleCount >>> 24) & 0xFF, // sample_count
            (sampleCount >>> 16) & 0xFF,
            (sampleCount >>>  8) & 0xFF,
            (sampleCount) & 0xFF,
            (offset >>> 24) & 0xFF,      // data_offset
            (offset >>> 16) & 0xFF,
            (offset >>>  8) & 0xFF,
            (offset) & 0xFF
        ], 0);

        for (let i = 0; i < sampleCount; i++) {
            let duration = samples[i].duration;
            let size = samples[i].size;
            let flags = samples[i].flags;
            let cts = samples[i].cts;
            data.set([
                (duration >>> 24) & 0xFF,  // sample_duration
                (duration >>> 16) & 0xFF,
                (duration >>>  8) & 0xFF,
                (duration) & 0xFF,
                (size >>> 24) & 0xFF,      // sample_size
                (size >>> 16) & 0xFF,
                (size >>>  8) & 0xFF,
                (size) & 0xFF,
                (flags.isLeading << 2) | flags.dependsOn,  // sample_flags
                (flags.isDependedOn << 6) | (flags.hasRedundancy << 4) | flags.isNonSync,
                0x00, 0x00,                // sample_degradation_priority
                (cts >>> 24) & 0xFF,       // sample_composition_time_offset
                (cts >>> 16) & 0xFF,
                (cts >>>  8) & 0xFF,
                (cts) & 0xFF
            ], 12 + 16 * i);
        }
        return MP41.box(MP41.types.trun, data);
    }

    static mdat(data) {
        return MP41.box(MP41.types.mdat, data);
    }

}

MP41.init();

export default MP41;