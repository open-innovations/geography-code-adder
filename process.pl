#!/usr/bin/perl
# Usage: perl process.pl --dir docs/data --format=JSON --file raw/Code_History_Database_(July_2024)/ChangeHistory.csv --equivalents raw/Code_History_Database_(July_2024)/Equivalents.csv
use strict;
use warnings;
use utf8;
use JSON::XS;
use Data::Dumper;
use Cwd qw(abs_path);
binmode STDOUT, 'utf8';
binmode STDERR, 'utf8';

# Get the real base directory for this script
my $basedir = "./";
if(abs_path($0) =~ /^(.*\/)[^\/]*/){ $basedir = $1; }

my (%geotypes,$r,$typ,$cd,$nm,$file,$fh,$args,@rows,@cols,@header,$c,%head,$ext,$supplemental,%equivalents,%types,@check,$str,@alts,$tmp,$g,$n);

# Get the command line arguments
$args = ParseCommandLine({
	'file'=>{'alias'=>['f','file'],'arguments'=>1},
	'dir'=>{'alias'=>['d','dir'],'arguments'=>1},
	'format'=>{'alias'=>['t','format'],'arguments'=>1},
	'equivalents'=>{'alias'=>['e','equivalents'],'arguments'=>1},
	'supplemental'=>{'alias'=>['s','supplemental'],'arguments'=>1}
});

if(!$args->{'file'}){ $args->{'file'} = "raw/Code_History_Database_(July_2024)/ChangeHistory.csv"; }
if(!$args->{'equivalents'}){ $args->{'equivalents'} = "raw/Code_History_Database_(July_2024)/Equivalents.csv"; }
if(!$args->{'supplemental'}){ $args->{'supplemental'} = "supplemental.json"; }
if(!$args->{'format'} || $args->{'format'} ne "CSV"){ $args->{'format'} = "JSON"; }


if(!-e $args->{'file'}){
	error("No CSV to process at <cyan>$args->{'file'}<none>\n");
	exit;
}
if(!-e $args->{'equivalents'}){
	error("No CSV to process at <cyan>$args->{'equivalents'}<none>\n");
	exit;
}

########################################
# Open the input files and process them

if(-e $args->{'supplemental'}){
	msg("Processing supplemental name lookup from <cyan>$args->{'supplemental'}<none>\n");
	%equivalents = %{LoadJSON($args->{'supplemental'})};
}

@rows = LoadCSV($basedir."code-types.csv");
@check = ("England","Wales","Scotland","Northern Ireland");
for($r = 0; $r < @rows; $r++){
	for($c = 0; $c < @check; $c++){
		if($rows[$r]->{$check[$c]}){
			$typ = $rows[$r]->{$check[$c]};
			if(!defined($geotypes{$typ})){ $geotypes{$typ} = {}; }
			$geotypes{$typ}{'description'} = $rows[$r]->{'Entity'};
		}
	}
}

msg("Processing CSV from <cyan>$args->{'file'}<none>\n");
open(FILE,"<:utf8",$args->{'file'});
while(<FILE>){
	@cols = split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/,$_);
	if(@header == 0){
		@header = @cols;
		for($c = 0; $c < @cols; $c++){
			$head{$cols[$c]} = $c;
		}
	}else{
		$typ = $cols[$head{'ENTITYCD'}];
		# Some have trailing whitespace
		$typ =~ s/ //g;
		$cd = $cols[$head{'GEOGCD'}];
		$nm = $cols[$head{'GEOGNM'}];
		$nm =~ s/(^\"|\"$)//g;
		if(!defined($geotypes{$typ})){ $geotypes{$typ} = {}; }
		if(!defined($geotypes{$typ}{'areas'})){ $geotypes{$typ}{'areas'} = {}; }
		# There can be multiple entries for each area ID due to
		# things like reflecting a change to parent geography
		if(!defined($geotypes{$typ}{'areas'}{$cd})){ $geotypes{$typ}{'areas'}{$cd} = (); }

		$tmp = {};

		if($nm){ $tmp->{'nm'} = $nm; }
		$geotypes{$typ}{'source'} = sanitiseFilename($args->{'file'});

		if($cols[$head{'STATUS'}]){
			$tmp->{'status'} = $cols[$head{'STATUS'}];
		}

		if($cols[$head{'PARENTCD'}]){
			$tmp->{'parent'} = $cols[$head{'PARENTCD'}];
		}
		if($cols[$head{'OPER_DATE'}] || $cols[$head{'TERM_DATE'}]){
			$tmp->{'date'} = {};
			if($cols[$head{'OPER_DATE'}]){
				$tmp->{'date'}{'s'} = fixDate($cols[$head{'OPER_DATE'}]);
			}
			if($cols[$head{'TERM_DATE'}]){
				$tmp->{'date'}{'e'} = fixDate($cols[$head{'TERM_DATE'}]);
			}
		}
		push(@{$geotypes{$typ}{'areas'}{$cd}},$tmp);
	}
}
close(FILE);

$typ = "";
@header = ();
msg("Processing CSV from <cyan>$args->{'equivalents'}<none>\n");
open(FILE,"<:utf8",$args->{'equivalents'});
while(<FILE>){
	$_ =~ s/[\n\r]//g;
	@cols = split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/,$_);
	if(@header == 0){
		@header = @cols;
		for($c = 0; $c < @cols; $c++){
			$head{$cols[$c]} = $c;
		}
	}else{
		$cd = $cols[$head{'GEOGCD'}];
		if($cd =~ /^([ESNW][0-9]{2})/){
			$typ = $1;
			if(!defined($equivalents{$cd})){
				$equivalents{$cd} = {};
			}
			for($g = 0; $g < @{$geotypes{$typ}{'areas'}{$cd}}; $g++){
				if($geotypes{$typ}{'areas'}{$cd}[$g]{'nm'}){
					for($c = 0; $c < @cols; $c++){
						if($header[$c] =~ /^GEOGNM/ && $cols[$c] ne ""){
							$cols[$c] =~ s/(^\"|\"$)//g;
							if($cols[$c] ne $geotypes{$typ}{'areas'}{$cd}[$g]{'nm'}){
								$equivalents{$cd}{$cols[$c]} = 1;
							}
						}
					}
					@alts = keys(%{$equivalents{$cd}});
					if(@alts > 0){
						@{$geotypes{$typ}{'areas'}{$cd}[$g]{'nm_alt'}} = sort(@alts);
					}
				}
			}
		}
	}
}
close(FILE);

# Update sort order
foreach $typ (sort(keys(%geotypes))){
	foreach $cd (sort(keys(%{$geotypes{$typ}{'areas'}}))){
		# Set sort order
		$n = @{$geotypes{$typ}{'areas'}{$cd}};
		if($n > 1){
			@{$geotypes{$typ}{'areas'}{$cd}} = sort{ ($b->{'date'}{'s'}||"1974-04-01") cmp ($a->{'date'}{'s'}||"1974-04-01") } @{$geotypes{$typ}{'areas'}{$cd}};
		}
	}
}



#########################
# Save outputs
if($args->{'format'}){
	warning("The CSV format will only keep one entry per code so some data loss may occur.\n");
}
foreach $typ (sort(keys(%geotypes))){
	msg("Processing geography type <yellow>$typ<none>\n");
	if($args->{'format'} eq "CSV"){
		$ext = ".csv";
	}else{
		$ext = ".json";
	}
	$file = $basedir.($args->{'dir'}||"./")."/".$typ.$ext;
	msg("\tSaving to <cyan>$file<none>\n");

	open($fh,">:utf8",$file);

	if($args->{'format'} eq "CSV"){
		print $fh "Code,Name,Start,End,Parent\n";
	}

	$c = 0;
	if($args->{'format'} eq "CSV"){

		foreach $cd (sort(keys(%{$geotypes{$typ}{'areas'}}))){

			# Only print the first in the array
			print $fh ",".($geotypes{$typ}{'areas'}{$cd}[0]{'nm'} =~ /,/ ? '"':'').$geotypes{$typ}{'areas'}{$cd}[0]{'nm'}.($geotypes{$typ}{'areas'}{$cd}[0]{'nm'} =~ /,/ ? '"':'');
			print $fh ",".$geotypes{$typ}{'areas'}{$cd}[0]{'start_date'};
			print $fh ",".$geotypes{$typ}{'areas'}{$cd}[0]{'end_date'};
			print $fh ",".$geotypes{$typ}{'areas'}{$cd}[0]{'parent'};
			print $fh "\n";

		}

	}else{

		$str = JSON::XS->new->canonical(1)->encode($geotypes{$typ});
		if($str eq "null"){ $str = "{}"; }
		$str =~ s/^\{/\{\n\t/;
		$str =~ s/("areas":\{)/$1\n\t\t/s;
		$str =~ s/\,(\"(E|N|W|S)[0-9]{8}\")/\,\n\t\t$1/g;
		$str =~ s/\},(\"description\")/\n\t\}\,\n\t$1/;
		$str =~ s/,(\"source\")/,\n\t$1/;
		$str =~ s/\}$/\n\}/;
		print $fh $str;

	}

	close($fh);
}






###############################
sub fixDate {
	my $str = shift;
	$str =~ s/([0-9]{2})\/([0-9]{2})\/([0-9]{4}) .*/$3-$2-$1/;
	return $str;
}
sub msg {
	my $str = $_[0];
	my $dest = $_[1]||"STDOUT";
	
	my %colours = (
		'black'=>"\033[0;30m",
		'red'=>"\033[0;31m",
		'green'=>"\033[0;32m",
		'yellow'=>"\033[0;33m",
		'blue'=>"\033[0;34m",
		'magenta'=>"\033[0;35m",
		'cyan'=>"\033[0;36m",
		'white'=>"\033[0;37m",
		'none'=>"\033[0m"
	);
	foreach my $c (keys(%colours)){ $str =~ s/\< ?$c ?\>/$colours{$c}/g; }
	if($dest eq "STDERR"){
		print STDERR $str;
	}else{
		print STDOUT $str;
	}
}

sub error {
	my $str = $_[0];
	$str =~ s/(^[\t\s]*)/$1<red>ERROR:<none> /;
	msg($str,"STDERR");
}

sub warning {
	my $str = $_[0];
	$str =~ s/(^[\t\s]*)/$1<yellow>WARNING:<none> /;
	msg($str,"STDERR");
}


# Version 1.4
sub ParseCSV {
	my $str = shift;
	my $config = shift;
	my (@rows,@cols,@header,$r,$c,@features,$data,$key,$k,$f,$n,$n2,$compact,$hline,$sline,$col);

	$compact = $config->{'compact'};
	if(not defined($config->{'header'})){ $config->{'header'} = {}; }
	if(not defined($config->{'header'}{'start'})){ $config->{'header'}{'start'} = 0; }
	if(not defined($config->{'header'}{'spacer'})){ $config->{'header'}{'spacer'} = 0; }
	if(not defined($config->{'header'}{'join'})){ $config->{'header'}{'join'} = "→"; }
	$sline = $config->{'startrow'}||1;
	$col = $config->{'key'};

	$n = () = $str =~ /\r\n/g;
	$n2 = () = $str =~ /\n/g;
	if($n < $n2 * 0.25){ 
		# Replace CR LF with escaped newline
		$str =~ s/\r\n/\\n/g;
	}
	@rows = split(/[\n]/,$str);

	$n = @rows;

	for($r = $config->{'header'}{'start'}; $r < @rows; $r++){
		$rows[$r] =~ s/[\n\r]//g;
		@cols = split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/,$rows[$r]);

		if($r < $sline-$config->{'header'}{'spacer'}){
			# Header
			if(!@header){
				for($c = 0; $c < @cols; $c++){
					$cols[$c] =~ s/(^\"|\"$)//g;
				}
				@header = @cols;
			}else{
				for($c = 0; $c < @cols; $c++){
					if($cols[$c]){ $header[$c] .= $config->{'header'}{'join'}.$cols[$c]; }
				}
			}
		}
		if($r >= $sline){
			$data = {};
			for($c = 0; $c < @cols; $c++){
				$cols[$c] =~ s/(^\"|\"$)//g;
				$data->{$header[$c]} = $cols[$c];
			}
			push(@features,$data);
		}
	}
	if($col){
		$data = {};
		for($r = 0; $r < @features; $r++){
			$f = $features[$r]->{$col};
			if($compact){ $f =~ s/ //g; }
			$data->{$f} = $features[$r];
		}
		return $data;
	}else{
		return @features;
	}
}

sub LoadCSV {
	# version 1.3
	my $file = shift;
	my $config = shift;
	
	msg("Processing CSV from <cyan>$file<none>\n");
	open(FILE,"<:utf8",$file);
	my @lines = <FILE>;
	close(FILE);
	return ParseCSV(join("",@lines),$config);
}


sub LoadJSON {
	my (@files,$str,@lines);
	my $file = $_[0];
	open(FILE,"<:utf8",$file);
	@lines = <FILE>;
	close(FILE);
	$str = (join("",@lines));
	# Error check for JS variable e.g. South Tyneside https://maps.southtyneside.gov.uk/warm_spaces/assets/data/wsst_council_spaces.geojson.js
	$str =~ s/[^\{]*var [^\{]+ = //g;
	if(!$str){ $str = "{}"; }
	return JSON::XS->new->decode($str);
}

# Version 1.0
# When calling a program we will allow command line arguments of the form:
#   <value>
#   --flag
#   --option=<value>
#   --option <value>
#   --option <value1> <value2>
#   --option <value1> --option <value2>
#
# We create a structure organised by output keys. Each output key has an 
# array of aliases and the number of arguments it will have (default 0).
# {
# 	'file'=>{'alias'=>['f','file'],'arguments'=>1}
# 	'latlon'=>{'alias'=>['ll','latlon'],'arguments'=>2}
# }
sub ParseCommandLine {
	my $keys = shift;
	my ($args,$prev,$key,$k,$v,$lookup,$i,$j);
	for $k (keys(%{$keys})){
		if(!defined($keys->{$k}{'arguments'})){ $keys->{$k}{'arguments'} = 0; }
		for($i = 0; $i < @{$keys->{$k}{'alias'}}; $i++){
			$lookup->{$keys->{$k}{'alias'}[$i]} = $k;
		}
	}
	$args = {'_values'=>[]};
	$prev = "";
	for(my $i = 0; $i < @ARGV; $i++){
		if($ARGV[$i] =~ /^\-\-?([^0-9][^\s\=]+)=?(.*)?/){
			$k = $1;
			$v = $2;
			if(defined($lookup->{$k})){
				$key = $lookup->{$k};
				if(!defined($args->{$key})){
					$args->{$key} = [];
				}
				if($v){
					$args->{$key}[@{$args->{$key}}] = $v;
				}
			}else{
				warning("Invalid command line option $k\n");
			}
			$prev = $key;
		}else{
			if(@{$args->{$prev}} < $keys->{$key}{'arguments'}){
				push(@{$args->{$prev}},$ARGV[$i]);
			}else{
				push(@{$args->{'_values'}},$ARGV[$i]);
			}
		}
	}
	for $k (keys(%{$args})){
		if($k ne "_values" && @{$args->{$k}} == 1){
			$args->{$k} = $args->{$k}[0];
		}
	}
	return $args;
}

sub sanitiseFilename {
	my $str = shift;
	$str =~ s/^raw\///g;
	$str =~ s/\.([^\.]*)$//g;
	$str =~ s/[^a-zA-Z0-9\(\)]/ /g;
	return $str;
}