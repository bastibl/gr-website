#!/bin/zsh


d=`date +%Y-%m-%d`

echo "number: $#"

if [ "$#" -ne 0 ]
then
    slug="$1"
else
    slug="new-post"
fi

dir="content/_news/${d}-${slug}"
f="content/_news/${d}-${slug}/index.j2"

echo "new post: ${slug}"
echo "file: ${f}"
echo "dir: ${dir}"

mkdir -p ${dir}

cat <<EOF >> ${f}


{% set author = "Jon Doe" %}
{% set description = "bli bla blubb" %}
{% set thumbnail = "/assets/imgs/gr_web.svg" %}
{% set title = "A new post" %}
{% set type = "internal" %}

{% filter markdown %}

# Hello World

{% endfilter %}

EOF

emacsclient -n ${f}
