#!/usr/bin/env bash

date -u +'%Y-%m-%dT%H:%M:%SZ Checking Samples'

# -N tells it not to print column headers. -B is "batch mode", and uses tabs to separate fields.

run_query(){
  title=$1
  query=$2
  # echo $query
  echo '-=-=' $1 '=-=-'
  docker run --rm -it mysql mysql -h euler.imetrical.com ted -N -B -e "$query"
}



run_query 'Missing samples in last day' "select json_object('now',now())"
run_query 'Missing samples in last day' "select json_object('since',DATE_SUB(NOW(), INTERVAL 24 HOUR),'samples', count(*), 'missing',86400-count(*) ) from watt where stamp>DATE_SUB(NOW(), INTERVAL 24 HOUR)"

# run_query 'Missing samples in last day' 'select DATE_SUB(NOW(), INTERVAL 24 HOUR) as since, count(*) as samples, 86400-count(*) as missing from watt where stamp>DATE_SUB(NOW(), INTERVAL 24 HOUR)'
# run_query 'Missing samples in last week - group by day' 'select concat(substring(stamp,1,11),"00:00:00") as day, round(avg(watt),0), count(*) as samples,86400-count(*) as missing from watt where stamp>DATE_SUB(NOW(), INTERVAL 7 DAY) group by day having missing>0'
# run_query 'Missing samples in last day - group by hour' 'select concat(substring(stamp,1,14),"00:00") as hour, round(avg(watt),0), count(*) as samples,3600-count(*) as missing from watt where stamp>DATE_SUB(NOW(), INTERVAL 24 HOUR) group by hour having missing>0'
# run_query 'Missing samples in last day - group by minute' 'select concat(substring(stamp,1,17),"00") as minute, round(avg(watt),0), count(*) as samples,60-count(*) as missing from watt where stamp>DATE_SUB(NOW(), INTERVAL 24 HOUR) group by minute having missing>0'
