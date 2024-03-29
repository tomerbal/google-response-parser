const cheerio = require('cheerio');
const validUrl = require('valid-url');

function parse(response, inputUrl) {
    const $ = cheerio.load(response);
    const output = {};

    output.objects = [{}];
    output.objects[0].type = "Google";
    output.objects[0].pageUrl = inputUrl;

    setDictionary($, output.objects[0]);
    setMusicCarousel($, output.objects[0]);
    setHasMap($, output.objects[0]);
    setHasCard($, output.objects[0]);
    setResults($, output.objects[0]);
    setAds($, output.objects[0]);
    setPla($, output.objects[0]);
    setDidYouMean($, output.objects[0]);
    setNumberOfResults($, output.objects[0]);
    setRelatedSearches($, output.objects[0]);
    setPeopleAlsoAsk($, output.objects[0]);
    if (output.objects[0].results) {
        console.log("number of results: " + output.objects[0].results.length);
    }
    setQuery(output.objects[0], inputUrl);
    return output;
}

function setQuery(output, url){
    function getParameterByName(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, '\\$&');
        var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    }
    output.query = decodeURIComponent(getParameterByName("q", url));
}

function setDictionary($, output) {
    output.hasDictionary = false;
    if ($('div[data-url*="/search?q=Dictionary"]').length > 0) {
        output.hasDictionary = true;
        console.log('dictionary: ' + true);
    }
}

function setMusicCarousel($, output) {
    output.hasMusicCarousel = false;
    var musicCarousel = $("#botabar");
    if (musicCarousel.length > 0 && musicCarousel.text().length > 0) {
        output.hasMusicCarousel = true;
        console.log('musicCarousel: ' + true);
    }
}

function setHasMap($, output) {
    const mapLinks = $('a[data-url*="/maps/"]');
    output.hasMap = mapLinks.length > 0 || $('img[src*="/maps/"]').length > 0;
    if (mapLinks.length > 0) {
        output.mapLinks = [];
        for (let i = 0; i < mapLinks.length; i++) {
            output.mapLinks.push(mapLinks[i].attribs["data-url"]);
        }
    }
}


function setHasCard($, output) {
    var xpdOpen = $(".xpdopen");
    var knowledgePanel = $(".knowledge-panel");

    var hasCard = xpdOpen.length > 0 || knowledgePanel.length > 0;
    var card = xpdOpen || knowledgePanel;
    output.hasCard = false;
    if (hasCard) {
        output.hasCard = true;
        output.googleCard = {};
        output.hasVideo = false;
        if (card.find('a[data-ved]>img').length > 0) {
            output.hasVideo = true;
        }
        if (xpdOpen) {
            output.googleCard.header = xpdOpen.find('.kno-ecr-pt.kno-fb-ctx').text();
            output.googleCard.title = xpdOpen.find('.sthby.kno-fb-ctx').text();
            output.googleCard.description = xpdOpen.find('.kno-rdesc > span').text();
        }
        if (knowledgePanel) {
            output.googleCard.header = knowledgePanel.find('.kno-ecr-pt.kno-fb-ctx').text();
            output.googleCard.title = knowledgePanel.find('.sthby.kno-fb-ctx').text();
            output.googleCard.description = knowledgePanel.find('.kno-rdesc > span').text();
        }
    }
}

function setResults($, output, inputNumberOfResults) {
    var results = $(".g");
    if (results.length > 0 && results.find("h3").length > 0) {
        output.results = [];
        results.each(function () {
            const result = {};
            var h3 = $(this).find("a h3").first();
            var a = h3.parent();
            var title = a.text().length > 0 ? a.text() : h3;
            if (title) {
                result.title = title;
            }
            var link = a.attr("href");
            if (link && !link.includes("/search?q=")) {
                link = link.replace("/url?q=", "").replace("/url?url=", "");
                result.link = link;
                $(this).find("em,b").each(function () {
                    result.emphasized = result.emphasized || "";
                    result.emphasized = result.emphasized + " " + $(this).text();
                });
                var missing = $(this).find("s");
                if (missing && missing.length > 0) {
                    result.missing = missing.text();
                }
                var text = $(this).find(".st");
                if (text) {
                    result.text = text.text();
                }
                var slp = $(this).find(".slp.f");
                var reviews = slp.find("g-review-stars");
                if (slp && slp.length > 0) {
                    if (reviews.length > 0) {
                        result.reviews = true;
                    }
                    else {
                        result.priceSchema = true;
                    }
                }
                output.results.push(result);
            }
        });

    }
    else {
        results = $(".xpd");
        if (results.length === 0) {
            output.noResults = true;
        }
        else {
            output.results = [];
            results.each(function () {
                const result = {};
                var a = $(this).find("a").first();
                var title = a.text();
                if (title) {
                    result.title = title;
                }
                var link = a.attr("href");
                if (link && !link.includes("/search?q=")) {
                    link = link.replace("/url?q=", "").replace("/url?url=", "");
                    result.link = link;
                }
                output.results.push(result);
            });
        }

    }
}

function setAds($, output) {
    var results = $('.ads-ad .ad_cclk, .ads-fr .xpd');
    if (results.length > 0) {
        output.adWords = [];
        results.each(function () {
            const result = {};
            result.title = $(this).find("h3").text() || $(this).find("a").children().first().text();
            result.link = $(this).find("a").slice(0, 1).prop("href") || $(this).find("a").attr("href");
            result.displayUrl = $(this).find(".ads-visurl cite").text() || $(this).find("a").children().last().children().last().text();
            output.adWords.push(result);
        });
    }
}

function setPla($, output) {
    var results = $('.pla-unit');
    output.pla = [];
    if (results.length > 0) {
        results.each(function () {
            if ($(this).children().length > 0) {
                const result = {};
                result.links = new Set();
                const links = $(this).find("a");
                links.each(function () {
                    const link = $(this).attr("href");
                    if (link !== "javascript:void(0)" && validUrl.isUri(link) && !link.includes("google.com")) {
                        result.links.add(link);
                    }
                });
                result.links = Array.from(result.links);
                result.text = "";
                const raw = $(this).find("*");
                if (raw.length > 0) {
                    raw.each(function () {
                        var text = $(this).contents().not($(this).children()).text();
                        if (text.length > 0) {
                            result.text = result.text + text + "; ";
                        }
                    });
                }
                result.title =  $(this).find(".pla-unit-title").text();
                result.by = $(this).find(".pla-extensions-container").text();
                output.pla.push(result);
            }
        });
    }
}

function setDidYouMean($, output) {
    var spell = $(".spell");
    output.hasDidYouMean = false;
    if (spell.text().length > 0) {
        output.hasDidYouMean = true;
        output.suggestedQuery = spell.find("b i").text();
    }
}

function setNumberOfResults($, output) {
    var numberOfResults = $("#resultStats");
    if (numberOfResults.text().length > 0) {
        output.number = numberOfResults.text();
    }
}

function setPeopleAlsoAsk($, output) {
    var questions = $(".related-question-pair");
    if (questions.length > 0) {
        output.peopleAlsoAsk = [];
        questions.each(function () {
            const result = {};
            result.question = $(this).find(".match-mod-horizontal-padding").text();
            output.peopleAlsoAsk.push(result);
        });
    }
}

function setRelatedSearches($, output) {
    var results = $(".brs_col a");
    if (results.length > 0) {
        output.relatedSearches = [];
        results.each(function () {
            const result = {};
            result.link = $(this).attr("href");
            result.title = $(this).text();
            output.relatedSearches.push(result);
        });
    }
}

module.exports = {
    parse: parse
};