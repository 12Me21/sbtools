////////////////////////
//// Headers Format ////
////////////////////////

var HEADER = [
	{pos:0x00, type:"Int16", value:0x0001      }, // 0 = builtin, 1 = saved by user?
	{pos:0x02, type:"Int16", name:"fileType"   }, // 0 = TXT, 1 = DAT
	{pos:0x04, type:"Int16", name:"compression"}, // 1 = zlib compressed
	{pos:0x06, type:"Int16", name:"icon"       }, // 0 = TXT/DAT, 1 = PRG/GRP (depending on fileType)
	{pos:0x08, type:"Int32", name:"fileSize"   }, // Size of data, not including header/footer (display only)
	{pos:0x0C, type:"Int16", name:"year"       }, // 
	{pos:0x0E, type:"Int8",  name:"month"      }, // 
	{pos:0x0F, type:"Int8",  name:"day"        }, // Modified date/time
	{pos:0x10, type:"Int8",  name:"hour"       }, // 
	{pos:0x11, type:"Int8",  name:"minute"     }, // 
	{pos:0x12, type:"Int8",  name:"second"     }, // 
	//{pos:0x13, type:"Int8", value:0x3}, Unknown
	{pos:0x14, type:"String8", arg:18, name:"author1"}, //hidden
	{pos:0x26, type:"String8", arg:18, name:"author2"}, //displayed, but replaced with author1 when uploaded
	{pos:0x38, type:"Int32", name:"uid1" }, //whatever
	{pos:0x3C, type:"Int32", name:"uid2" },
	//{pos=0x40, size=16, name="unused"},
], HEADER_SIZE = 80;

var DAT_HEADER = [
	{pos:0x00, type:"Uint32", value:0x4E424350}, //PCBN
	{pos:0x04, type:"Uint32", value:0x31303030}, //0001
	{pos:0x08, type:"Int16", name:"dataType"}, //3 = uint16 (colors), 4 = int32, 5 = double
	{pos:0x0A, type:"Int16", name:"dimensions"},
	{pos:0x0C, type:"Int32", name:"dimension1"},
	{pos:0x10, type:"Int32", name:"dimension2"},
	{pos:0x14, type:"Int32", name:"dimension3"},
	{pos:0x18, type:"Int32", name:"dimension4"},
], DAT_HEADER_SIZE = 28;

var FOOTER_SIZE = 20;

//////////
////  ////
//////////

//header: Object
//  data: Uint8Array
//return: Uint8Array
function writeFile(header, data){
	var isDat = header.fileType==1;
	var dataLength = data.length;
	
	//pad data length
	if(isDat){
		var type=header.dataType;
		if(type==3) //col
			dataLength = Math.ceil(dataLength/2)*2;
		else if(type==4) //int
			dataLength = Math.ceil(dataLength/4)*4;
		else if(type==5) //float
			dataLength = Math.ceil(dataLength/8)*8;
		
		dataLength += DAT_HEADER_SIZE;
		var newData = new Uint8Array(dataLength);
		templateSet(newData,DAT_HEADER,header,0);
		newData.set(data,DAT_HEADER_SIZE);
		data = newData;
	}
	
	if(header.compression){
		data=pako.deflate(data);
		dataLength=data.length;
	}
	
	var file = new Uint8Array(HEADER_SIZE+dataLength+FOOTER_SIZE);
	header.fileSize=dataLength;
	
	file.set(data,HEADER_SIZE);
	
	templateSet(file,HEADER,header,0);
	
	setFooter(file);
	return file;
}

//  file: Uint8Array
//header: Object
//return: Uint8Array
function readFile(file, header){
	templateGet(file,HEADER,header,0);
	var isDat = header.fileType==1;
	var data = file.slice(HEADER_SIZE,file.length-FOOTER_SIZE);
	if(header.compression){
		data = pako.inflate(data);
	}
	if(isDat){
		templateGet(data,DAT_HEADER,header,0);
		data = data.slice(DAT_HEADER_SIZE);
	}
	return data;
}

////////////////
//// Footer ////
////////////////

var HMAC_KEY = [110,113,109,98,121,43,101,57,83,63,123,37,85,42,45,86,93,53,49,110,37,94,120,90,77,107,56,62,98,123,63,120,93,38,63,40,78,109,109,86,91,44,103,56,53,58,37,54,83,113,100,34,39,85,34,41,47,56,117,55,55,85,76,50];

//file: Uint8Array
function setFooter(file){
	var withoutFooter = file.length-FOOTER_SIZE;
	file.set(sha1_hmac(new Uint8Array(file.buffer, 0, withoutFooter), HMAC_KEY), withoutFooter);
}

///////////////////
//// Templates ////
///////////////////

//    file: Uint8Array
//template: Array
//  header: Object
//  offset: Number
function templateSet(file, template, header, offset){
	var view = new DataView(file.buffer);
	template.forEach(function(item){
		var value = item.name ? header[item.name] : item.value;
		var arg = item.arg===undefined ? true : item.arg;
		view["set"+item.type](item.pos+ +offset,value,arg);
	});
}

//    file: Uint8Array
//template: Array
//  header: Object
//  offset: Number
function templateGet(file, template, header, offset){
	var view = new DataView(file.buffer);
	template.forEach(function(item){
		var arg = item.arg===undefined ? true : item.arg;
		var value = view["get"+item.type](item.pos+ +offset,arg);
		if(item.name){
			header[item.name] = value;
		}else if(value != item.value){
			console.warn("template value error");
			//return null;
		}
	});
}

////////////////////////
//// DataView UTF-8 ////
////////////////////////

DataView.prototype.getString8 = function(pos,length){
	var string="";
	for(var i=0;i<length;i++){
		var chr=this.getUint8(pos+i,true);
		if(chr==0)
			break;
		string+=String.fromCharCode(chr);
	}
	return string;
}

DataView.prototype.setString8 = function(pos,string,length){
	string=string.substr(0,length-1);
	for(var i=0;i<string.length;i++)
		this.setUint8(pos+i,string.charCodeAt(i));
	this.setUint8(pos+i,0);
}

//credits:
//record, Y, snail, trinitro, 12Me21