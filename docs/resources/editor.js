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

		var msg = new OI.logger(this.name+' v'+this.version,{el:document.getElementById('messages'),'visible':['info','warning','error'],'fade':60000,'class':'msg'});
		var _obj = this;
		this.spinner = document.createElement('div');
		this.spinner.classList.add('spinner');
		this.spinner.style['text-align'] = "center";
		this.spinner.innerHTML = '<img src="https://open-innovations.org/resources/images/loader.svg" alt="Loading..." />';

		this.saveable = (typeof Blob==="function");

		this.buildOutput = function(csv){
			this.data = CSV2JSON(csv);
			msg.log('Build output',this.data);

			var el = document.getElementById('msg-start-edit');
			if(el) el.innerHTML = '';

			// Reshape the data
			var data = new Array(this.data.length);
			for(r = 0; r < this.data.length; r++) data[r] = this.data[r].cols;

			// Update the table
			this.csvedit.updateData(data,this.data[0].order);

			document.getElementById('geography-add').disabled = false;
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
			reader.onerror = function(e){ msg.error('Failed to read file'); };
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

		this.toggleOpenDialog = function(){
			msg.log('toggle',window.getComputedStyle(document.getElementById('dialog-open')).display);
			var o = (window.getComputedStyle(document.getElementById('dialog-open')).display=="none");
			document.getElementById('output').style.display = (o ? 'none' : 'block');
			document.getElementById('dialog-open').style.display = (o ? 'block' : 'none');
			return this;
		};

		this.reset = function(){
			document.getElementById('geography-add').disabled = true;
			this.data = {};
			var el = document.getElementById('no-file');
			if(el) el.remove();
			this.updateFileDetails();

			return this;
		};

		this.resize = function(){
			var main = document.getElementById('main');
			var head = document.querySelector('header');
			var nav = document.querySelector('nav');
			var h = window.outerHeight - head.offsetHeight - nav.offsetHeight;
			main.style['max-height'] = h+'px';
			main.style['overflow-y'] = 'auto';
			return this;
		};

		this.saveCSV = function(){
			var str,file,type,c,r,m,cols;
			file = "test.csv";
			type = "text/csv";
			if(document.getElementById('url').value) file = document.getElementById('url').value;
			if(document.getElementById('standard_files').files.length > 0) file = document.getElementById('standard_files').files[0].name;

			if(!this.csvedit){
				msg.warn('No data to save',{'fade':5000});
				return this;
			}
			// Build CSV
			str = "";
			// Build header row
			for(c = 0; c < this.csvedit.order.length; c++){
				m = this.csvedit.order[c].match(",");
				str += (c>0?',':'')+(m ? '\"' : '')+this.csvedit.order[c]+(m ? '\"' : '');
			}
			str += "\n";
			cols = this.csvedit.order;
			// Build rows
			for(r = 0; r < this.csvedit.data.length; r++){
				for(c = 0; c < cols.length; c++){
					m = ((this.csvedit.data[r][cols[c]]||"")+"").match(",");
					str += (c>0?',':'')+(m ? '\"' : '')+this.csvedit.data[r][cols[c]]+(m ? '\"' : '');
				}
				str += "\n";
			}
			var textFileAsBlob = new Blob([str], {type:type});
			var fileNameToSaveAs = file;
			function destroyClickedElement(event){ document.body.removeChild(event.target); }
			var dl = document.createElement("a");
			dl.download = fileNameToSaveAs;
			dl.innerHTML = "Download File";
			if(window.webkitURL != null){
				// Chrome allows the link to be clicked
				// without actually adding it to the DOM.
				dl.href = window.webkitURL.createObjectURL(textFileAsBlob);
			}else{
				// Firefox requires the link to be added to the DOM
				// before it can be clicked.
				dl.href = window.URL.createObjectURL(textFileAsBlob);
				dl.onclick = destroyClickedElement;
				dl.style.display = "none";
				document.body.appendChild(dl);
			}
			dl.click();
			this.stopEdit();
			return this;
		};

		this.startEdit = function(){
			if(!this._unsaved){
				this._unsaved = true;
				document.getElementById('msg-start-edit').innerHTML = 'Unsaved changes';
				if(document.getElementById('btn-save')) document.getElementById('btn-save').disabled = false;
			}
			return this;
		};

		this.stopEdit = function(){
			if(document.getElementById('msg-start-edit')) document.getElementById('msg-start-edit').innerHTML = '';
			if(document.getElementById('btn-save')) document.getElementById('btn-save').disabled = true;
			this._unsaved = false;
			return this;
		};

		this.updateButtons = function(){
			var me = this.csvedit;
			if(document.getElementById('btn-delete')) document.getElementById('btn-delete').disabled = (me.selected.cols.length>0 || me.selected.rows.length>0) ? false : true;
			if(document.getElementById('btn-add-gss')) document.getElementById('btn-add-gss').disabled = (me.selected.cols.length!=1);
			document.getElementById('btn-remove-empty-rows').disabled = (me._emptyrows.length==0);
			if(document.getElementById('btn-isodate')) document.getElementById('btn-isodate').disabled = (me.selected.cols.length==0);
		};

		this.startGeographies = function(){
			this._geomodal = new Modal('add-geographies',document.getElementById('dialog-config'));
			this.updateType();
			return this;
		};

		this.processGeography = function(){
			var typ,yyyy,d,geo,r,part,cd,colname,lookup,i,datum,nm,cd,parents,matches,m,gooddate,ok,j,cdcol,unique,matched;
			typ = document.getElementById('geography-type').value;
			yyyy = document.getElementById('geography-year').value;
			d = yyyy+'-04-01';

			cdcol = typ+yyyy.substr(2,)+'CD';

			if(this.csvedit.order.includes(cdcol)){
				msg.warn('There is already a column for '+cdcol);
				this._geomodal.close();
				return this;
			}

			colname = this.csvedit.order[this.csvedit.selected.cols[0]-1];
			// First get all the geography values
			geo = new Array(this.csvedit.data.length);
			// Lowercase the name and replace trailing spaces
			for(r = 0; r < this.csvedit.data.length; r++) geo[r] = {'v':this.csvedit.data[r][colname].toLowerCase().replace(/\s+$/g,''),'code':''};

			// Get data into a nicer structure based on names
			lookup = {};
			for(part in this.lookup.data[typ]){
				for(cd in this.lookup.data[typ][part].areas){
					for(j = 0; j < this.lookup.data[typ][part].areas[cd].length; j++){
						nm = this.lookup.data[typ][part].areas[cd][j].nm.toLowerCase();
						if(!lookup[nm]) lookup[nm] = [];
						datum = {'code':cd,'date':this.lookup.data[typ][part].areas[cd][j].date,'parent':this.lookup.data[typ][part].areas[cd][j].parent};
						lookup[nm].push(datum);
						if(nm.match(/ and /)){
							nm = nm.replace(/ and /," & ");
							if(!lookup[nm]) lookup[nm] = [];
							lookup[nm].push(datum);
						}
						if(this.lookup.data[typ][part].areas[cd][j].nm_alt){
							// Loop over alternate names
							for(i = 0; i < this.lookup.data[typ][part].areas[cd][j].nm_alt.length; i++){
								nm = this.lookup.data[typ][part].areas[cd][j].nm_alt[i].toLowerCase();
								if(!lookup[nm]) lookup[nm] = [];
								if(nm) lookup[nm].push(datum);
								if(nm.match(/ and /)){
									nm = nm.replace(/ and /," & ");
									if(!lookup[nm]) lookup[nm] = [];
									lookup[nm].push(datum);
								}
							}
						}
					}
				}
			}

			// First pass to look for matches.
			parents = {};
			for(r = 0; r < geo.length; r++){
				nm = geo[r].v
				if(nm){
					if(nm in lookup){
						if(lookup[nm].length==1){
							geo[r].code = lookup[nm][0].code;
							if(typeof parents[lookup[nm][0].parent]==="undefined"){
								parents[lookup[nm][0].parent] = 0;
							}
							parents[lookup[nm][0].parent]++;
						}
					}
				}
			}

			// Second pass to look for those without codes and then work out if there is a good match based on parent
			matched = {};
			var bad = 0;
			for(r = 0; r < geo.length; r++){
				nm = geo[r].v
				// Use our lookup table that we build as we go (to save some time)
				if(nm in matched) geo[r].code = matched[nm];
				if(!geo[r].code){
					if(nm){
						if(nm in lookup){
							matches = [];
							if(Object.keys(parents).length <= 3){
								// If we have a limited number of parents we limit by parents (or no parent)
								for(m = 0; m < lookup[nm].length; m++){
									if(typeof lookup[nm][m].parent==="undefined" || lookup[nm][m].parent in parents){
										matches.push(lookup[nm][m]);
									}
								}
							}else{
								// Otherwise keep all the matches
								for(m = 0; m < lookup[nm].length; m++) matches.push(lookup[nm][m]);
							}
							// Now go through matches and see how many are valid in time
							gooddate = [];
							for(m = 0; m < matches.length; m++){
								ok = true;
								if(matches[m].date.s && d < matches[m].date.s) ok = false; 
								if(matches[m].date.e && d > matches[m].date.e) ok = false; 
								if(ok) gooddate.push(matches[m]);
							}
							if(gooddate.length==1){
								geo[r].code = gooddate[0].code;
								matched[nm] = geo[r].code;
							}else{
								unique = {};
								// Check how many codes we actually have left;
								for(m = 0; m < gooddate.length; m++){
									unique[gooddate[m].code] = true;
								}
								unique = Object.keys(unique);
								
								if(unique.length==1){
									geo[r].code = unique[0];
									matched[nm] = geo[r].code;
								}else{
									msg.warn('No match for %c'+nm+'%c on row %c'+(r+1)+'%c','font-style:italic;','','font-weight:bold','',matches,gooddate,unique);
								}
							}
						}
					}
				}
				if(!geo[r].code) bad++;
			}
			if(bad > 0) msg.warn('Failed to match %c'+bad+'%c of '+geo.length+' rows','font-weight:bold','');

			this.startEdit();

			// Update values
			for(r = 0; r < geo.length; r++) this.csvedit.data[r][cdcol] = geo[r].code||"";
			// Insert a column heading before the selected column
			var idx = this.csvedit.selected.cols[0]-1;
			this.csvedit.order.splice(idx,0,cdcol);

			this.csvedit.updateData(this.csvedit.data,this.csvedit.order);

			this.csvedit.selected = {'cols':[],'rows':[]};

			// Close the modal
			this._geomodal.close();

			return this;
		};

		this.updateType = function(){
			el = document.getElementById('geography-type');
			msg.log('Type',el.value);

			document.getElementById('geography-add').disabled = true;

			if(el.value){
				if(document.getElementById('geography-lookup-error')) document.getElementById('geography-lookup-error').remove();
				el.disabled = true;
				el.after(this.spinner);
				this.lookup.load(el.value);
			}
			return this;
		};

		this.init = function(){

			this.lookup = new GeographyLookup({
				'dir':'data/',
				'on': {
					'load': function(){
						_obj.spinner.remove();
						document.getElementById('geography-type').disabled = false;
						document.getElementById('geography-add').disabled = false;
					},
					'error': function(){
						_obj.spinner.remove();
						document.getElementById('geography-type').disabled = false;
					}
				}
			});

			// Create a navigation bar
			this.nav = new NavBar(document.getElementById('navigation'));
			this.nav.addButton({
				'id':'btn-open',
				'text':'<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-folder-fill" viewBox="0 0 16 16"><path d="M9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.825a2 2 0 0 1-1.991-1.819l-.637-7a2 2 0 0 1 .342-1.31L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3m-8.322.12q.322-.119.684-.12h5.396l-.707-.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981z"/><title>Open</title></svg>',
				'class':'icon c5-bg',
				'on':{
					'click': _obj.toggleOpenDialog
				}
			});

			if(this.saveable){
				this.nav.addButton({
					'id':'btn-save',
					'text':'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-download" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"/><title>Save</title></svg>',
					'class':'icon c5-bg',
					'on':{
						'click': function(e){ 
							_obj.saveCSV();
						}
					}
				});
				_obj.stopEdit();
				window.addEventListener("beforeunload", function (e) {
					if(_obj._unsaved){
						var confirmationMessage = 'It looks like you have unsaved changes.';
						(e || window.event).returnValue = confirmationMessage; //Gecko + IE
						return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
					}
					return;
				});
			}

			this.nav.addButton({
				'id':'btn-delete',
				'class':'icon c5-bg',
				'text':'<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-trash-fill" viewBox="0 0 16 16"><path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5M8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5m3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0"/><title>Delete</title></svg>',
				'on':{
					'click': function(e){ _obj.csvedit.delete(); }
				}
			}).addButton({
				'id':'btn-remove-empty-rows',
				'class':'c5-bg',
				'text':'<svg xmlns="http://www.w3.org/2000/svg" stroke="currentColor" class="bi" viewBox="0 0 16 16"><path d="M2 5h12v5h-12v-5M6 5v5M10 5v5M14 2l-12 12" fill="transparent" /><title>Remove empty rows</title></svg>',
				'on':{
					'click': function(e){
						// Remove any message about empty rows
						msg.remove('empty-rows');
						_obj.csvedit.deleteEmptyRows();
					}
				}
			}).addButton({
				'id':'btn-add-gss',
				'class':'c5-bg',
				'text': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi" viewBox="0 0 16 16"><path d="M3 8m-0.5 0.5l-2.5 0 0 -1 2.5 0 0 -2.5 1 0 0 2.5 2.5 0 0 1 -2.5 0 0 2.5 -1 0 0 -2.5z"/><text x="6.5" y="2" text-anchor="start" dominant-baseline="hanging" font-size="4.5" font-family="Poppins">E06</text><text x="6.5" y="6" text-anchor="start" dominant-baseline="hanging" font-size="4.5" font-family="Poppins">S14</text><text x="6.5" y="10" text-anchor="start" dominant-baseline="hanging" font-size="4.5" font-family="Poppins">N05</text><title>Add GSS codes</title></svg>',
				'on':{
					'click': function(e){ _obj.startGeographies(); }
				}
			}).addButton({
				'id':'btn-isodate',
				'class':'c5-bg',
				'text':'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi" viewBox="0 0 16 16"><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/><text x="8" y="7" text-anchor="middle" dominant-baseline="hanging" font-size="5" font-family="Poppins">8601</text><title>Convert dates to ISO8601</title></svg>',
				'on':{
					'click': function(e){
						_obj.startEdit();
						_obj.csvedit.updateSelectedColumns(function(otxt){
							if(otxt && otxt.match(/^[0-9]{2}\/[0-9]{2}\/[0-9]{4}$/)){
								return otxt.replace(/^([0-9]{2})[\/\-]([0-9]{2})[\/\-]([0-9]{4})$/,function(m,p1,p2,p3){ return p3+'-'+p2+'-'+p1; });
							}
							return otxt;
						});
					}
				}
			});

			this.nav.addText({'id':'msg-start-edit'});
			
			document.querySelectorAll('.btn-open').forEach(function(el){ el.addEventListener('click',function(){ _obj.toggleOpenDialog(); }); });

			// Build the CSV editor - must be after the navbar
			this.csvedit = new OI.CSVEditor(document.getElementById('output'),{
				'delete': function(){},
				'select': function(){},
				'load': function(){
					if(this._emptyrows.length > 0){
						msg.warn('There seem to be '+this._emptyrows.length+' empty rows. You can remove them with the <svg xmlns="http://www.w3.org/2000/svg" stroke="currentColor" class="bi" viewBox="0 0 16 16"><path d="M2 5h12v5h-12v-5M6 5v5M10 5v5M14 2l-12 12" fill="transparent"></path><title>Remove empty rows</title></svg> menu button.',{'id':'empty-rows'});
					}
				},
				'update': function(){
					_obj.updateButtons();
				},
				'edit': function(){
					_obj.startEdit();
				}
			});
			this.csvedit.update();

			// Update year
			var year = document.getElementById('geography-year');
			if(year.value==""){
				var d = new Date();
				year.value = d.getFullYear();
				year.setAttribute('max',year.value);
			}

			document.getElementById('reset').addEventListener('click',function(e){
				document.getElementById('standard_files').value = '';
				_obj.reset();
			});

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
			document.getElementById('geography-add').addEventListener('click',function(){ _obj.processGeography(); });

			// Build any examples
			var exs = document.querySelectorAll('a.example');
			for(var i = 0; i < exs.length ; i++){
				exs[i].addEventListener('click',function(e){
					e.preventDefault();
					document.getElementById('url').value = e.target.getAttribute('href');
				});
			}

			// Add info button
			
			var info = document.createElement('div');
			info.classList.add('info');
			info.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" class="bi bi-info-circle-fill" viewBox="0 0 16 16"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2"/></svg>';
			info.addEventListener('click',function(e){
				var foot = document.querySelector('footer');
				var main = document.getElementById('main');
				var o = window.getComputedStyle(foot).display;
				if(o=="none"){
					foot.style.display = "block";
					main.style.display = "none";
				}else{
					foot.style.display = "none";
					main.style.display = "block";
				}
			});
			document.querySelector('header').append(info);

			this.reset();

			window.addEventListener('resize',this.resize);
			this.resize();

			return this;
		};

		this.init();

		return this;
	}

	function NavBar(el,opt){
		var buttons = [],ev;
		function addEl(typ,opts){
			if(!opts) opts = {};
			var btn = document.createElement(typ);
			if(opts.id) btn.setAttribute('id',opts.id);
			if(opts.class) btn.classList.add(...opts.class.split(/ /));
			if(opts.on){
				for(ev in opts.on){
					btn.addEventListener(ev,opts.on[ev]);
				}
			}
			btn.innerHTML = opts.text||"&nbsp;";
			buttons.push(btn);
			el.append(btn);
			return this;
		}
		this.addButton = function(opts){
			addEl('button',opts);
			return this;
		};
		this.addText = function(opts){
			addEl('div',opts);
			return this;
		};
		return this;
	}

	function GeographyLookup(opt){
		if(!opt) opt = {};
		if(!opt.on) opt.on = {};
		if(!opt.dir) opt.dir = "";
		var msg = new OI.logger('Geography Lookup',{el:document.getElementById('dialog-config-messages'),'visible':['info','warning','error'],'fade':60000,'class':'msg'});
		this.data = {};
		this.ready = false;
		this.lookup = {
			'LAD':['E06','E07','E08','E09','N09','S12','W06'],
			'WD':['E05','N08','W05','S13'],
			'PCON':['E14','N05','N06','W07','S14']
		};
		this.setOpt = function(i,o){
			opt[i] = o;
			return this;
		};
		this.doneLoading = function(cb){
			this.ready = true;
			if(typeof cb==="function") cb.call(this);
			if(typeof opt.on.load==="function") opt.on.load.call(this);
			return this;
		};
		this.getCode = function(name,code,cb){
			if(this.data[name][code]){
				this.loaded++;
				if(this.loaded==this.toload) this.doneLoading(cb);
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
					if(this.loaded==this.toload) this.doneLoading(cb);
				}).catch(e => {
					msg.error('There has been a problem loading CSV data from <em>%c'+url+'%c</em>. It may not be publicly accessible or have some other issue.','font-style:italic;','font-style:normal;',{'id':'geography-lookup-error'});
					if(typeof opt.on.error==="function") opt.on.error.call(this);
				});
			}
			return this;
		};
		this.load = function(name,cb){
			var i;
			if(name){
				this.ready = false;
				if(this.lookup[name]){
					if(!this.data[name]) this.data[name] = {};
					this.loaded = 0;
					this.toload = this.lookup[name].length;
					for(i = 0; i < this.lookup[name].length; i++){
						if(this.data[name][this.lookup[name][i]]) this.loaded++;
					}
					if(this.toload==this.loaded){
						this.doneLoading(cb);
					}else{
						for(i = 0; i < this.lookup[name].length; i++) this.getCode(name,this.lookup[name][i],cb);
					}
				}else{
					msg.warn('No known geography of type <em>'+name+'</em>.',{'id':'geography-lookup-error'});
					if(typeof opt.on.error==="function") opt.on.error.call(this);
				}
			}
			return this;
		};

		return this;
	}

	function Modal(id,inner){
		var el = document.getElementById(id);
		var p = inner.parentNode;
		var _obj = this;
		if(!el){
			el = document.createElement('div');
			el.classList.add('modal');
			el.innerHTML = '<div class="modal-inner b6-bg"></div>';
			el.id = id;
			el.addEventListener('click',function(e){
				if(e.target==el) _obj.close();
			});
		}
		this.el = el.querySelector('.modal-inner');
		if(inner){
			inner.style.display = "";
			this.el.append(inner);
		}
		this.close = function(){
			if(inner){
				p.appendChild(inner);
				inner.style.display = "none";
			}
			document.body.removeChild(el);
			return this;
		};
		document.body.append(el);
		return this;
	}

	function niceSize(b){
		if(b > 1e12) return (b/1e12).toFixed(2)+" TB";
		if(b > 1e9) return (b/1e9).toFixed(2)+" GB";
		if(b > 1e6) return (b/1e6).toFixed(2)+" MB";
		if(b > 1e3) return (b/1e3).toFixed(2)+" kB";
		return (b)+" bytes";
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
OI.ready(function(){ app = new OI.Application({}); });