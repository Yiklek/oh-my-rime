basedir=$(cd "$(dirname "$0")" || exit; pwd)
basedir=$(dirname $basedir)
echo $basedir
url=https://github.com/Yiklek/oh-my-rime/releases/download/latest/openfly.extend.dict.yaml
# target=$basedir/../build/openfly/openfly.extend.dict.yaml
target=$basedir/build/openfly.extend.dict.yaml
echo "download openfly extend dictionary to ${target}"
curl -L $url -o $target
