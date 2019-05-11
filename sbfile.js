////////////////////////
//// Headers Format ////
////////////////////////

var HEADER = [
	{pos:0x00, type:"Uint16", value:0x0000},
	{pos:0x02, type:"Int16",  name:"fileType"}, //0=TXT, 1=DAT
	{pos:0x04, type:"Int16",  name:"compression"}, //4 = zlib compressed? (DAT only)
	{pos:0x06, type:"Int16",  name:"icon"},     //0=TXT/DAT, 1=PRG/GRP
	{pos:0x08, type:"Int32",  name:"fileSize"}, //size of data, not including header/footer (display only)
	{pos:0x0C, type:"Int32",  name:"year"},     
	{pos:0x0E, type:"Int8",   name:"month"},    
	{pos:0x0F, type:"Int8",   name:"day"},
	{pos:0x10, type:"Int8",   name:"hour"},
	{pos:0x11, type:"Int8",   name:"minute"},
	{pos:0x12, type:"Int8",   name:"second"},
	{pos:0x13, type:"Uint8", value:0x3},
	//1 byte ?
	{pos:0x14, type:"StringUtf8", arg:18, name:"author1"}, //hidden
	{pos:0x26, type:"StringUtf8", arg:18, name:"author2"}, //displayed, but replaced with author1 when uploaded
	{pos:0x38, type:"Int32",  name:"blacklist1"}, //whatever
	{pos:0x3C, type:"Int32",  name:"blacklist2"},
	//{pos=0x40, size=16, name="unused"},
]

var DAT_HEADER = [
	{pos:0x00, type:"Uint32", value:0x4E424350}, //PCBN
	{pos:0x04, type:"Uint32", value:0x31303030}, //0001
	{pos:0x08, type:"Int16", name:"dataType"}, //3 = uint16 (colors), 4 = int32, 5 = double
	{pos:0x0A, type:"Int16", name:"dimensions"},
	{pos:0x0C, type:"Int32", name:"dimension1"},
	{pos:0x10, type:"Int32", name:"dimension2"},
	{pos:0x14, type:"Int32", name:"dimension3"},
	{pos:0x18, type:"Int32", name:"dimension4"},
]

//////////
////  ////
//////////

//{} header
//Uint8Array data
function writeFile(header, data){
	var isDat = header.fileType==1;
	var dataLength = data.length;
	
	//pad data length
	if(isDat){
		var type=header.dataType;
		if(type==3) //col
			dataLength=Math.ceil(dataLength/2)*2;
		else if(type==4) //int
			dataLength=Math.ceil(dataLength/4)*4;
		else if(type==5) //float
			dataLength=Math.ceil(dataLength/8)*8;
		
		var newData=new Uint8Array(dataLength+28);
		templateSet(newData,DAT_HEADER,header,0);
		newData.set(data,28);
		data=newData;
		dataLength+=28;
	}
	
	if(header.compression){
		data=pako.deflate(data);
		dataLength=data.length;
	}
	
	var file = new Uint8Array(80+dataLength+20);
	header.fileSize=dataLength;
	
	file.set(data,80);
	
	templateSet(file,HEADER,header,0);
	
	setFooter(file);
	return file;
}

//file: Uint8Array
//header: Object(OUT)
//Uint8Array

//doesn't work right now)
function readFile(file, header){
	templateGet(file,HEADER,header);
	var isDat = header.fileType==1;
	var headerSize = isDat ? 108 : 80;
	if(isDat)
		templateGet(file,DAT_HEADER,header);
	var data=file.slice(headerSize, file.length-20);
	//if(header.compressed==4){
	//	data=pako.inflateRaw(data);
	//}
	return data;
}

////////////////
//// Footer ////
////////////////

var HMAC_KEY = [110,113,109,98,121,43,101,57,83,63,123,37,85,42,45,86,93,53,49,110,37,94,120,90,77,107,56,62,98,123,63,120,93,38,63,40,78,109,109,86,91,44,103,56,53,58,37,54,83,113,100,34,39,85,34,41,47,56,117,55,55,85,76,50];

//Uint8Array file: full SB file with space for footer
function setFooter(file){
	var withoutFooter = file.length-20;
	file.set(sha1_hmac(new Uint8Array(file.buffer, 0, withoutFooter), HMAC_KEY), withoutFooter);
}

///////////////////
//// Templates ////
///////////////////

//Uint8Array file
function templateSet(file, template, header, offset){
	var view = new DataView(file.buffer);
	template.forEach(function(item){
		var value = item.name ? header[item.name] : item.value;
		var arg = item.arg===undefined ? true : item.arg;
		view["set"+item.type](item.pos+ +offset,value,arg);
	});
}

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

DataView.prototype.getStringUtf8 = function(pos,length){
	var string="";
	for(var i=0;i<length;i++){
		var chr=this.getUint8(pos+i,true);
		if(chr==0)
			break;
		string+=String.fromCharCode(chr);
	}
	return fromUtf8(string);
}

DataView.prototype.setStringUtf8 = function(pos,string,length){
	string=toUtf8(string).substr(0,length-1);
	for(var i=0;i<string.length;i++)
		this.setUint8(pos+i,string.charCodeAt(i));
	this.setUint8(pos+i,0);
}

function fromUtf8(s) {
	try{
		return decodeURIComponent(escape(s));
	}catch(e){
		return s;
	}
}

function toUtf8(s) {
	return unescape(encodeURIComponent(s));
}