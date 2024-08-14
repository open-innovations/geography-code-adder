/**
	Open Innovations tool that attempts to add GSS codes to a CSV based on names
	Version 0.1
 */
(function(root){

	var OI = root.OI || {};
	if(!OI.ready){
		OI.ready = function(fn){
			// Version 1.1
			if(document.readyState != 'loading') fn();
			else document.addEventListener('DOMContentLoaded', fn);
		};
	}

	function Application(opts){
		if(!opts) opts = {};
		
		this.name = "Geography Code Adder";
		this.version = "0.1";

		let msg = new OI.logger(this.name+' v'+this.version,{el:document.getElementById('messages'),'visible':['info','warning','error'],'fade':60000,'class':'msg'});
		var _obj = this;

		this.buildOutput = function(csv){
			this.data = CSV2JSON(csv);
			msg.log('Build output',this.data);
			
			this.csvedit.updateData(this.data,this.data[0].order);

			document.getElementById('process').disabled = false;
			return this;
		};

		this.getURL = function(url){
			var m = url.match("https://docs.google.com/spreadsheets/d/([^\/]*)");
			if(m) url = "https://docs.google.com/spreadsheets/d/"+m[1]+"/gviz/tq?tqx=out:csv";
			if(url){
				fetch(url,{}).then(response => {
					if(!response.ok) throw new Error('Network response was not OK');
					return response.text();
				}).then(txt => {
					this.buildOutput(txt);
					this.toggleOpenDialog();
				}).catch(e => {
					msg.error('There has been a problem loading CSV data from <em>%c'+url+'%c</em>. It may not be publicly accessible or have some other issue.','font-style:italic;','font-style:normal;');
				});
			}
			return this;
		};

		this.readFile = function(myFile){
			var reader = new FileReader();
			reader.readAsText(myFile, "UTF-8");
			reader.addEventListener('load',function(e){ _obj.buildOutput(e.target.result); _obj.toggleOpenDialog(); });
			reader.onerror = function(e){ msg.error('Failed to read file'); }
			return this;
		};

		this.updateFileDetails = function(){
			msg.log('Update file details',document.getElementById('standard_files').files);
			var el = document.getElementById('standard_files');
			if(el.files && el.files[0]){
				var myFile = el.files[0];
				document.querySelector('#drop_zone .info').innerHTML = 'File: <em>'+myFile.name+'</em><br />Size: '+niceSize(myFile.size);
			}else{
				document.querySelector('#drop_zone .info').innerHTML = '';
			}
			return this;
		};

		this.updateType = function(){
			msg.log('Type',document.getElementById('geography-type').value);
			this.lookup.load(document.getElementById('geography-type').value,function(){ msg.log('loaded all',this); });
		};

		this.updateColumn = function(c){
			msg.log('Column',c);
		};

		this.toggleOpenDialog = function(){
			msg.log('toggle',window.getComputedStyle(document.getElementById('dialog-open'))['display'])
			var o = (window.getComputedStyle(document.getElementById('dialog-open'))['display']=="none");
			document.getElementById('output').style.display = (o ? 'none' : 'block');
			document.getElementById('dialog-open').style.display = (o ? 'block' : 'none');
			return this;
		};

		this.reset = function(){
			document.getElementById('process').disabled = true;
			this.data = {};
			var el = document.getElementById('no-file');
			if(el) el.remove();
			this.updateFileDetails();
			this.updateType();

			return this;
		};

		this.init = function(){

			this.lookup = new GeographyLookup({'dir':'data/'});

			// Create a navigation bar
			this.nav = new NavBar(document.getElementById('navigation'));
			this.nav.addButton({
				'id':'btn-open',
				'text':'<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-folder-fill" viewBox="0 0 16 16"><path d="M9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.825a2 2 0 0 1-1.991-1.819l-.637-7a2 2 0 0 1 .342-1.31L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3m-8.322.12q.322-.119.684-.12h5.396l-.707-.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981z"/></svg>',
				'class':'icon c5-bg',
				'on':{
					'click': _obj.toggleOpenDialog
				}
			}).addButton({
				'id':'btn-add-gss',
				'class':'c5-bg',
				'text': 'Add GSS codes'
			}).addButton({
				'id':'btn-delete',
				'class':'icon c5-bg',
				'text':'<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-trash-fill" viewBox="0 0 16 16"><path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5M8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5m3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0"/></svg>',
				'on':{
					'click': function(e){ _obj.csvedit.delete(); }
				}
			});
			document.querySelectorAll('.btn-open').forEach(function(el){ el.addEventListener('click',function(){ _obj.toggleOpenDialog(); }); });

			// Build the CSV editor - must be after the navbar
			this.csvedit = new OI.CSVEditor(document.getElementById('output'),{
				'delete': function(){
					//console.log('delete',this);
				},
				'select': function(){
					//console.log('select',this);
				},
				'update': function(){
					document.getElementById('btn-delete').style.display = (this.selected.cols.length>0 || this.selected.rows.length>0) ? '' : 'none';
					document.getElementById('btn-add-gss').style.display = (this.selected.cols.length==1) ? '' : 'none';
				}
			});
			this.csvedit.update();

			// Update year
			var year = document.getElementById('geography-year');
			if(year.value==""){
				var d = new Date();
				year.value = d.getFullYear();
				year.setAttribute('max',year.value)
			}

			document.getElementById('reset').addEventListener('click',function(e){ document.getElementById('standard_files').value = ''; _obj.reset(); });

			// Add callbacks
			document.getElementById('btnSubmit').addEventListener('click',function(e){
				e.preventDefault();
				// Remove any existing warning message
				var el = document.getElementById('no-file');
				if(el) el.remove();
				// If we have a file we read that
				var file = document.getElementById('standard_files').files[0];
				if(file) _obj.readFile(file);
				else{
					// Try to read a URL
					var url = document.getElementById('url').value;
					if(url) _obj.getURL(url);
					else msg.warn('No input CSV provided. Please provide a URL or a file.',{'id':'no-file'});
				}
			});

			document.getElementById('url').addEventListener('change',function(e){ _obj.getURL(e.target.value); });
			function dropOver(evt){
				evt.stopPropagation();
				evt.preventDefault();
				dropZone.classList.add('drop');
			}
			function dragOff(){ dropZone.classList.remove('drop'); }
			var dropZone = document.getElementById('drop_zone');
			dropZone.addEventListener('dragover', dropOver, false);
			dropZone.addEventListener('dragout', dragOff, false);
			document.getElementById('standard_files').addEventListener('change',function(e){ dragOff(); _obj.updateFileDetails(); });

			document.getElementById('geography-type').addEventListener('change',function(){ _obj.updateType(); });

			// Build any examples
			var exs = document.querySelectorAll('a.example');
			for(var i = 0; i < exs.length ; i++){
				exs[i].addEventListener('click',function(e){
					e.preventDefault();
					document.getElementById('url').value = e.target.getAttribute('href');
					//_obj.getURL(e.target.getAttribute('href'));
				});
			}

			this.reset();

			return this;
		};


		this.init();

		return this;
	}

	function NavBar(el,opt){
		this.buttons = [];
		this.addButton = function(opts){
			if(!opts) opts = {};
			var btn = document.createElement('button');
			if(opts.id) btn.setAttribute('id',opts.id);
			if(opts.class) btn.classList.add(...opts.class.split(/ /));
			if(opts.on){
				for(ev in opts.on){
					btn.addEventListener(ev,opts.on[ev]);
				}
			}
			btn.innerHTML = opts.text;
			this.buttons.push(btn);
			el.append(btn);
			return this;
		}
		return this;
	}

	function GeographyLookup(opt){
		if(!opt) opt = {};
		if(!opt.dir) opt.dir = "";
		var msg = new OI.logger('Geography Lookup',{el:document.getElementById('messages'),'visible':['info','warning','error'],'fade':60000,'class':'msg'});
		this.data = {};
		this.lookup = {
			'LAD':['E06','E07','E08','E09','N09','S12','W06'],
			'WD':['E05','N08','W05','S13'],
			'PCON':['E14','N05','W07','S14']
		};
		this.getCode = function(name,code,cb){
			if(this.data[name][code]){
				this.loaded++;
				if(this.loaded==this.toload && typeof cb==="function") cb.call(this);
			}else{
				this.data[name][code] = {};
				var url = opt.dir+code+'.json';
				msg.log('Loading '+url);
				fetch(url,{}).then(response => {
					if(!response.ok) throw new Error('Network response was not OK');
					return response.json();
				}).then(json => {
					this.loaded++;
					this.data[name][code] = json;
					if(this.loaded==this.toload && typeof cb==="function") cb.call(this);
				}).catch(e => {
					msg.error('There has been a problem loading CSV data from <em>%c'+url+'%c</em>. It may not be publicly accessible or have some other issue.','font-style:italic;','font-style:normal;');
				});
			}
			return this;
		}
		this.load = function(name,cb){
			if(name){
				if(this.lookup[name]){
					this.loaded = 0;
					this.toload = 0;
					if(!this.data[name]) this.data[name] = {};
					for(var i = 0; i < this.lookup[name].length; i++){
						if(!this.data[name][this.lookup[name][i]]){ this.toload++; }
					}
					for(var i = 0; i < this.lookup[name].length; i++) this.getCode(name,this.lookup[name][i],cb);
				}else{
					msg.warn('No known geography of type <em>'+name+'</em>.');
				}
			}
			return this;
		}
		return this;
	}

	function niceSize(b){
		if(b > 1e12) return (b/1e12).toFixed(2)+" TB";
		if(b > 1e9) return (b/1e9).toFixed(2)+" GB";
		if(b > 1e6) return (b/1e6).toFixed(2)+" MB";
		if(b > 1e3) return (b/1e3).toFixed(2)+" kB";
		return (b)+" bytes";
	}

	if(!OI.logger){
		// Version 1.5
		OI.logger = function(title,attr){
			if(!attr) attr = {};
			title = title||"OI Logger";
			var ms = {};
			this.logging = (location.search.indexOf('debug=true') >= 0);
			if(console && typeof console.log==="function"){
				this.log = function(){ if(this.logging){ console.log.apply(null,getParam(arguments)); updatePage('log',arguments); } };
				this.info = function(){ console.info.apply(null,getParam(arguments)); updatePage('info',arguments); };
				this.warn = function(){ console.warn.apply(null,getParam(arguments)); updatePage('warning',arguments); };
				this.error = function(){ console.error.apply(null,getParam(arguments)); updatePage('error',arguments); };
			}
			this.remove = function(id){
				var el = attr.el.querySelector('#'+id);
				if(ms[id]) clearTimeout(ms[id]);
				el.remove();
			};
			function updatePage(){
				if(attr.el){
					var cls = arguments[0];
					var txt = Array.prototype.shift.apply(arguments[1]);
					var opt = arguments[1]||{};
					if(opt.length > 0) opt = opt[opt.length-1];
					if(attr.visible.includes(cls)) opt.visible = true;
					if(opt.visible){
						var el = document.createElement('div');
						el.classList.add('message',cls);
						if(attr.class) el.classList.add(...attr.class.split(/ /));
						el.innerHTML = txt.replace(/\%c/g,"");
						el.style.display = (txt ? 'block' : 'none');
						attr.el.prepend(el);
						id = "default";
						if(opt.id){
							id = opt.id;
							el.setAttribute('id',opt.id);
						}
						ms[id] = setTimeout(function(){ el.remove(); },(typeof opt.fade==="number" ? opt.fade : (typeof attr.fade==="number" ? attr.fade : 10000)));
					}
				}
			}
			function getParam(){
				var a = Array.prototype.slice.call(arguments[0], 0);
				var str = (typeof a[0]==="string" ? a[0] : "");
				// Build basic result
				var ext = ['%c'+title+'%c: '+str.replace(/<[^\>]*>/g,""),'font-weight:bold;',''];
				var n = (str ? 1 : 0);
				// If there are extra parameters passed we add them
				return (a.length > n) ? ext.concat(a.splice(n)) : ext;
			}
			return this;
		};
	}

	// Simple CSV to JSON parser v3.2
	function CSV2JSON(str,opts){
		// Convert \r\n to \n, remove final newline, and split by newlines
		var lines = str.replace(/[\n\r]{2}/g,"\n").replace(/[\n\r]+$/g,"").split(/\n/);
		var header = [],cols,i,c,data = [],datum,v;
		for(i = 0; i < lines.length; i++){
			cols = lines[i].split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/);
			if(i==0){
				header = cols;
				for(c = 0; c < header.length; c++) header[c] = cols[c].replace(/(^\"|\"$)/g,"");
			}else{
				datum = {'order':header,'cols':{}};
				for(c = 0; c < header.length; c++){
					v = cols[c].replace(/(^\"|\"$)/g,"");
					if(parseFloat(v)==v) v = parseFloat(v);
					if(v=="True" || v=="true") v = true;
					if(v=="False" || v=="false") v = false;
					datum.cols[header[c]] = v;
				}
				data.push(datum);
			}
		}
		return data;
	}

	OI.Application = Application;

	root.OI = OI||root.OI||{};

})(window || this);

var app;
OI.ready(function(){
	app = new OI.Application({});
});