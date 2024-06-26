import { Combobox, Dialog } from "@headlessui/react";
import { CheckIcon, MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import axios from "axios";
import { motion } from "framer-motion";
import { DateTime } from "luxon";
import React, { useContext, useEffect, useState } from "react";
import { CurrentDataContext, PredictionContext, UnitContext } from "../App";
import { Spinner } from "./Spinner";
import Toggle from "./Toggle";

const formatToDate = (secs, format = "ccc, dd LLL yyyy") =>
  DateTime.fromSeconds(secs).setZone(0).toFormat(format);

const formatToTime = (secs, timezone, format = "HH:mm") =>
  DateTime.fromSeconds(secs).setZone(timezone).toFormat(format);

const formatResult = (data) => {
  if (data.isCity)
    return `${data.city ? data.city + ", " : ""}${
      data.country ? data.country : ""
    }`;
  else
    return `${data.district ? data.district + ", " : ""}${
      data.city ? data.city + ", " : ""
    }${data.country ? data.country : ""}`;
};

export const SearchBar = () => {
  const [selectedCity, setSelectedCity] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(true);

  const { setCurrent } = useContext(CurrentDataContext);
  const { setPrediction } = useContext(PredictionContext);
  const { unit } = useContext(UnitContext);

  useEffect(() => {
    if (query.length > 2) {
      var config = {
        method: "get",
        url: `https://api.geoapify.com/v1/geocode/autocomplete?text=${query}&apiKey=48b2131fa3f942de8abc6e39cbb1528f`,
        headers: {},
      };
      setLoading(true);
      axios(config)
        .then((resp) => {
          setSearchResults(
            resp.data.features
              .filter((_, index) => index < 4)
              .map((query, index) => ({
                key: index,
                address: query.properties.formatted,
                district: query.properties.address_line1,
                city: query.properties.city,
                country: query.properties.country,
                lat: query.properties.lat,
                lon: query.properties.lon,
                isCity: query.properties.result_type === "city" ? true : false,
              }))
          );
          setLoading(false);
        })
        .catch((err) => {
          console.log(err);
          setLoading(false);
        });
    } else {
      setSearchResults([]);
    }
  }, [query]);

  useEffect(() => {
    setQuery("");
    setIsOpen(false);
    setSearchResults([]);
    const URL = `https://api.openweathermap.org/data/2.5/onecall?lat=${
      selectedCity.lat
    }&lon=${
      selectedCity.lon
    }&exclude=current,minutely,hourly,alerts&appid=895284fb2d2c50a520ea537456963d9c&units=${
      unit ? "metric" : "imperial"
    }`;
    axios
      .get(URL)
      .then((resp) => {
        const timezone = resp.data.timezone;

        setCurrent({
          location: formatResult(selectedCity),
          lat: selectedCity.lat,
          lon: selectedCity.lon,
          date: formatToDate(resp.data.daily[0].dt),
          time: formatToTime(resp.data.daily[0].dt, timezone),
          sunrise: formatToTime(resp.data.daily[0].sunrise, timezone),
          sunset: formatToTime(resp.data.daily[0].sunset, timezone),
          feels_like: resp.data.daily[0].feels_like,
          humidity: resp.data.daily[0].humidity,
          temp: resp.data.daily[0].temp,
          wind_speed: resp.data.daily[0].wind_speed,
          condition: resp.data.daily[0].weather[0].description,
        });

        setPrediction(
          resp.data.daily.slice(1).map((item, index) => ({
            key: index,
            date: formatToDate(item.dt),
            time: formatToTime(item.dt, timezone),
            temp: item.temp,
            feels_like: item.feels_like,
            condition: item.weather[0].description,
          }))
        );
      })
      .catch((err) => {
        console.log(err);
      });
    setSelectedCity([]);
  }, [submitted]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    }

    function onEnter(e) {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSubmitted((prev) => !prev);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keydown", onEnter);

    return () => {
      window.addEventListener("keydown", onEnter);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div className="flex justify-between items-center z-10 space-x-4">
      <button
        className="w-[250px] sm:w-[380px] bg-black border border-[#344347] flex items-center opacity-[.39] rounded-lg px-2 py-4 ss:space-x-3 focus:outline-none"
        onClick={() => {
          setIsOpen(true);
          setSubmitted(false);
        }}
      >
        <div className="flex items-center w-full">
          <MagnifyingGlassIcon className="w-6 h-6 text-darkGrey" />
          <div className="w-full justify-between flex items-center font-satoshi font-medium text-base sm:text-lg px-2 text-darkGrey ml-2">
            <span>Search</span>
            <span>Ctrl K</span>
          </div>
        </div>
      </button>
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        className="fixed inset-0 pt-10 ss:pt-[20vh] z-10"
      >
        <div className="fixed inset-0 bg-gray-800/20 backdrop-blur" />
        <Dialog.Panel className="relative shadow-lg bg-darkPurple overflow-y-auto ring-1 ring-darkGrey/10 rounded-xl px-4 py-3 w-[250px] xs:w-[380px] mx-auto">
          <Combobox value={selectedCity} by="key" onChange={setSelectedCity}>
            <div className="flex items-center rounded-md px-2 py-2 ss:py-3 ss:space-x-3 w-full">
              <MagnifyingGlassIcon className="w-4 h-4 ss:w-5 ss:h-5 text-darkGrey inline-block " />
              <Combobox.Input
                onChange={(event) => setQuery(event.target.value)}
                displayValue={(city) => formatResult(city)}
                className="bg-inherit border-none focus:outline-none font-satoshi font-medium text-base sm:text-lg px-2 text-darkGrey rounded-md placeholder:text-darkGrey placeholder:font-satoshi placeholder:font-medium sm:placeholder:text-lg overflow-x-hidden"
                placeholder="Search for your city ..."
                autoComplete="off"
              />
              {loading && <Spinner />}
            </div>
            {searchResults.length > 0 && (
              <>
                <Combobox.Options
                  static
                  className="overflow-hidden mt-1 px-2 rounded-md py-1 mb-2"
                >
                  {searchResults.map((res) => (
                    <Combobox.Option
                      key={res.key}
                      value={res}
                      className="cursor-pointer rounded-md w-full py-3 px-2 text-offWhite font-satoshi text-sm sm:text-base ui-active:bg-[#2e2945] overflow-hidden flex justify-between items-center"
                    >
                      {({ selected }) => (
                        <>
                          <span>{formatResult(res)}</span>
                          {selected && (
                            <div className="ml-1">
                              <CheckIcon className="w-5 h-5 text-darkGrey" />
                            </div>
                          )}
                        </>
                      )}
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
                <div className="flex justify-between items-center px-2 py-1">
                  <Toggle />
                  <motion.button
                    className="px-3 py-2 rounded-md font-satoshi text-base sm:text-lg bg-[#2e2945] text-offWhite font-medium"
                    onClick={() => setSubmitted((prev) => !prev)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Search
                  </motion.button>
                </div>
              </>
            )}
          </Combobox>
        </Dialog.Panel>
      </Dialog>
    </div>
  );
};

export { formatToDate, formatToTime };
