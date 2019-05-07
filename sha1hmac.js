function sha1_hmac(msg, key){	
	if (key.length > 64)// keys longer than blocksize are shortened
		key = sha1(key);
	
	var oKeyPad = new Uint8Array(64+20);
	var iKeyPad = new Uint8Array(64+msg.length);
	
	for (var i = 0; i < 64; ++i) {
		oKeyPad[i] = key[i] ^ 0x5C;
		iKeyPad[i] = key[i] ^ 0x36;
	}
	iKeyPad.set(msg,64);
	
	var iPadRes = sha1(iKeyPad);
	oKeyPad.set(iPadRes,64)
	
	return sha1(oKeyPad);
};

function sha1(msg){
	function rotate_left(n,s) {
		var t4 = ( n<<s ) | (n>>>(32-s));
		return t4;
	}

	var blockstart;
	var i, j;
	var W = new Array(80);
	var H0 = 0x67452301;
	var H1 = 0xEFCDAB89;
	var H2 = 0x98BADCFE;
	var H3 = 0x10325476;
	var H4 = 0xC3D2E1F0;
	var A, B, C, D, E;

	var msg_len = msg.length;

	var word_array = [];
	for( i=0; i<msg_len-3; i+=4 ) {
		j = msg[i]<<24 | msg[i+1]<<16 | msg[i+2]<<8 | msg[i+3];
		word_array.push(j);
	}

	switch( msg_len % 4 ) {
		case 0:
			i = 0x080000000;
		break;
		case 1:
			i = msg[msg_len-1]<<24 | 0x0800000;
		break;

		case 2:
			i = msg[msg_len-2]<<24 | msg[msg_len-1]<<16 | 0x08000;
		break;

		case 3:
			i = msg[msg_len-3]<<24 | msg[msg_len-2]<<16 | msg[msg_len-1]<<8	| 0x80;
		break;
	}

	word_array.push( i );

	while( (word_array.length % 16) != 14 ) word_array.push( 0 );

	word_array.push( msg_len>>>29 );
	word_array.push( (msg_len<<3)&0x0ffffffff );

	for ( blockstart=0; blockstart<word_array.length; blockstart+=16 ) {
		for( i=0; i<16; i++ )
			W[i] = word_array[blockstart+i];
		for( i=16; i<=79; i++ ) 
			W[i] = rotate_left(W[i-3] ^ W[i-8] ^ W[i-14] ^ W[i-16], 1);

		A = H0;
		B = H1;
		C = H2;
		D = H3;
		E = H4;

		for( i= 0; i<=19; i++ ) {
			temp = (rotate_left(A,5) + ((B&C) | (~B&D)) + E + W[i] + 0x5A827999) & 0xffffffff;
			E = D;
			D = C;
			C = rotate_left(B,30);
			B = A;
			A = temp;
		}

		for( i=20; i<=39; i++ ) {
			temp = (rotate_left(A,5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0xffffffff;
			E = D;
			D = C;
			C = rotate_left(B,30);
			B = A;
			A = temp;
		}

		for( i=40; i<=59; i++ ) {
			temp = (rotate_left(A,5) + ((B&C) | (B&D) | (C&D)) + E + W[i] + 0x8F1BBCDC) & 0xffffffff;
			E = D;
			D = C;
			C = rotate_left(B,30);
			B = A;
			A = temp;
		}

		for( i=60; i<=79; i++ ) {
			temp = (rotate_left(A,5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0xffffffff;
			E = D;
			D = C;
			C = rotate_left(B,30);
			B = A;
			A = temp;
		}

		H0 = (H0 + A) & 0xffffffff;
		H1 = (H1 + B) & 0xffffffff;
		H2 = (H2 + C) & 0xffffffff;
		H3 = (H3 + D) & 0xffffffff;
		H4 = (H4 + E) & 0xffffffff;
	}
	
	var result = new Uint8Array(20);
	var dataview = new DataView(result.buffer);
	dataview.setUint32(0,H0,false);
	dataview.setUint32(4,H1,false);
	dataview.setUint32(8,H2,false);
	dataview.setUint32(12,H3,false);
	dataview.setUint32(16,H4,false);
	
	return result;
};