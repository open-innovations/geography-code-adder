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

		let msg = new OI.logger(this.name+' v'+this.version,{el:document.getElementById('messages'),'visible':['info','warning','error'],'fade':60000,'class':'padded'});

		msg.log();

		var _obj = this;

		this.buildOutput = function(csv){
			msg.info('buildOutput',csv);
			this.data = CSV2JSON(csv);
			document.getElementById('output').innerHTML = csv;
			console.log(this.data);

			// Update select and options
			if(!this.select){
				this.select = document.createElement('select');
				this.select.setAttribute('id','column');
				this.label = document.createElement('label');
				this.label.innerHTML = 'Select column for geography:'
				this.label.setAttribute('for','column');
				document.getElementById('output').before(this.label);
				document.getElementById('output').before(this.select);
				this.select.addEventListener('change',function(e){
					_obj.updateColumn(e.target.value);
				});
			}
			this.select.innerHTML = '';
			opt = document.createElement('option');
			opt.innerHTML = 'Column';
			this.select.append(opt);
			for(var c = 0; c < this.data[0].order.length; c++){
				opt = document.createElement('option');
				opt.setAttribute('value',this.data[0].order[c]);
				opt.innerHTML = this.data[0].order[c];
				this.select.append(opt);
			}
			return this;
		}
		this.getURL = function(url){
			var m = url.match("https://docs.google.com/spreadsheets/d/([^\/]*)");
			if(m) url = "https://docs.google.com/spreadsheets/d/"+m[1]+"/gviz/tq?tqx=out:csv";
			if(url){
				fetch(url,{}).then(response => {
					if(!response.ok) throw new Error('Network response was not OK');
					return response.text();
				}).then(txt => {
					this.buildOutput(txt);
				}).catch(e => {
					msg.error('There has been a problem loading CSV data from <em>%c'+url+'%c</em>. It may not be publicly accessible or have some other issue.','font-style:italic;','font-style:normal;');
				});
			}
			return this;
		}
		this.readFile = function(myFile){
			document.querySelector('#drop_zone .info').innerHTML = 'Size: '+niceSize(myFile.size);
			var reader = new FileReader();
			reader.readAsText(myFile, "UTF-8");
			reader.addEventListener('load',function(e){ _obj.buildOutput(e.target.result); });
			reader.onerror = function(e){ msg.error('Failed to read file'); }
			return this;
		}
		this.updateColumn = function(c){
			msg.info('Column',c);
		}

		// Add callbacks
		document.getElementById('btnSubmit').addEventListener('click',function(e){
			e.preventDefault();
			var file = document.getElementById('standard_files').files[0];
			if(file) _obj.readFile(file);
			else _obj.getURL(document.getElementById('url').value);
		});
		document.getElementById('url').addEventListener('change',function(e){ _obj.getURL(e.target.value); });
		document.getElementById('standard_files').addEventListener('change',function(e){
			msg.log('Update file');
			if(e.target.files && e.target.files[0]){
				_obj.readFile(e.target.files[0]);
			}
			return this;
		});

		// Build any examples
		var exs = document.querySelectorAll('a.example');
		for(var i = 0; i < exs.length ; i++){
			exs[i].addEventListener('click',function(e){
				e.preventDefault();
				document.getElementById('url').value = e.target.getAttribute('href');
				_obj.getURL(e.target.getAttribute('href'));
			});
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

OI.ready(function(){
	var app = new OI.Application({});
});