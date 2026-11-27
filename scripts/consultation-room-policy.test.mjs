import test from 'node:test';import assert from 'node:assert/strict';import {roomPolicy,reservedParticipantMinutes,canReserve} from '../lib/consultation/room-policy.ts';
const id='12345678-1234-1234-1234-123456789abc';
test('private room limited to two and bounded expiry',()=>{const p=roomPolicy(id,1000,1600,true);assert.equal(p.privacy,'private');assert.equal(p.properties.max_participants,2);assert.equal(p.properties.eject_at_room_exp,true);assert.equal(p.properties.enable_knocking,false);assert.equal(p.properties.start_with_video_off,true);});
test('rejects malformed identifier and invalid expiry',()=>{for(const [s,e] of [['bad',1100],[id,1000],[id,1601],[id,NaN]])assert.throws(()=>roomPolicy(s,1000,e,false));});
test('reserves rounded participant minutes',()=>{assert.equal(reservedParticipantMinutes(1000,1061),4);assert.equal(reservedParticipantMinutes(1000,1600),20);});
test('quota rejects unknown, negative and insufficient budget',()=>{assert.equal(canReserve(9000,8980,0,20),true);assert.equal(canReserve(9000,8980,1,20),false);assert.equal(canReserve(9000,NaN,0,20),false);assert.equal(canReserve(9000,-1,0,20),false);});
