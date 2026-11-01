import test from 'node:test';import assert from 'node:assert/strict';
import {perceptualHash,similarPhotos,reviewSignals} from '../lib/moderation-signals.mjs';
import {frontend} from './helpers/frontend.mjs';
test('phone threshold and keywords are review hints including negated context',()=>{
  assert.deepEqual(reviewSignals({phoneListingCount:3}),[]);assert.deepEqual(reviewSignals({phoneListingCount:4}),['phone_many_listings']);
  assert.deepEqual(reviewSignals({description:'Fără comision, agenție, exclusivitate.'}),['keyword_comision','keyword_agentie','keyword_exclusivitate']);assert.deepEqual(reviewSignals({description:'Comisionar agențies exclusivitatea'}),[]);
});
test('perceptual signatures detect similar patterns, exclude flat pictures and invalid hashes',()=>{
  const make=(width,height,light=0)=>{const data=new Uint8Array(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,v=Math.min(255,Math.floor(x/width*200)+light);data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;}return {width,height,data};};
  const a=perceptualHash(make(90,80)),b=perceptualHash(make(180,160,20));assert.equal(similarPhotos(a,b),true);assert.equal(perceptualHash({width:1,height:1,data:new Uint8Array([80,80,80,255])}),null);assert.equal(similarPhotos(null,null),false);assert.equal(similarPhotos('0000000000000000','ffffffffffffffff'),false);
  assert.deepEqual(reviewSignals({photoHashes:[a]},[{photoHashes:[b]}]),['similar_photo_other_account']);
});
test('trust panel distinguishes missing evidence, recorded dates and phone status in every listing state',()=>{
  const f=frontend();for(const status of ['draft','pending','published','rejected','withdrawn','sold','rented'])for(const phoneVerified of [true,false]){const panel=f.run('listingTrust('+JSON.stringify({status,phoneVerified})+')');assert.match(panel.textContent,/Nu avem o dată înregistrată/);assert.match(panel.textContent,/Ce nu verificăm: identitatea civilă/);assert.match(panel.textContent,phoneVerified?/Telefon confirmatDa/:/Telefon confirmatNu/);}
  assert.doesNotMatch(f.run('listingTrust({phoneVerified:true,ownerDeclaredAt:1790000000000,availabilityConfirmedAt:1790000000000,moderationApprovedAt:1790000000000})').textContent,/Nu avem o dată/);
});
